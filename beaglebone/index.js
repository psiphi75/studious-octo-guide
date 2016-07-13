/*********************************************************************
 *                                                                   *
 *   Copyright 2016 Simon M. Werner                                  *
 *                                                                   *
 *   Licensed to the Apache Software Foundation (ASF) under one      *
 *   or more contributor license agreements.  See the NOTICE file    *
 *   distributed with this work for additional information           *
 *   regarding copyright ownership.  The ASF licenses this file      *
 *   to you under the Apache License, Version 2.0 (the               *
 *   "License"); you may not use this file except in compliance      *
 *   with the License.  You may obtain a copy of the License at      *
 *                                                                   *
 *      http://www.apache.org/licenses/LICENSE-2.0                   *
 *                                                                   *
 *   Unless required by applicable law or agreed to in writing,      *
 *   software distributed under the License is distributed on an     *
 *   "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY          *
 *   KIND, either express or implied.  See the License for the       *
 *   specific language governing permissions and limitations         *
 *   under the License.                                              *
 *                                                                   *
 *********************************************************************/

'use strict';

/*
 * TODO: Refactor this code to: config / sensors / comms.
 */

/*******************************************************************************
 *                                                                             *
 *          Configuration settings - need to be customised to requirements     *
 *                                                                             *
 *******************************************************************************/

var cfg = require('config');
var logger = require('./logger');

// Required for the compass to determine true north (from the magnetic
// declination).  The latitude / longitude values can be approximate.
var declinationDeg = 0;
if (cfg.location.latitude && cfg.location.longitude) {
    var geomagnetism = require('geomagnetism');
    var geo = geomagnetism.model().point([cfg.location.latitude, cfg.location.longitude]);
    declinationDeg = geo.decl;
}


/*
 * Output config settings - we will pick these up later.
 */
var header = cfg.util.cloneDeep(cfg);
header.timestamp = new Date().getTime();
logger.info('Starting the-whole-shebang:');
logger.info('--- CONFIG START ---');
logger.info('HEADER:' + JSON.stringify(header));
logger.info('--- CONFIG END ---');


/*******************************************************************************
 *                                                                             *
 *                           Load necessary libraries                          *
 *                                                                             *
 *******************************************************************************/

/* Set this for octalbonescript such that it does load capes automatically */
process.env.AUTO_LOAD_CAPE = 0;
var obs = require('octalbonescript');
var util = require('./util');

var GPS = require('./gps');
var gps = new GPS(cfg.gps.serialport, cfg.gps.baudrate);

var Mpu9250 = require('mpu9250');
Mpu9250.prototype.getMotion9Async = function(callback) {
    callback(null, imu.getMotion9());
};
Mpu9250.prototype.getMotion6Async = function(callback) {
    callback(null, imu.getMotion6());
};
var imu = new Mpu9250(cfg.mpu9250.options);

imu.initialize();

/*******************************************************************************
 *                                                                             *
 *                           Sensor collection code                            *
 *                                                                             *
 *******************************************************************************/

var lastStatusSendTime = 0;
var lastSailValue;
var lastRudderValue;


/**
 * This will asyncronously retreive the sensor data (gyro, accel and compass).
 * GPS data is not included since it is retreived only every second.
 */
var sensorSamplePeriod = cfg.mpu9250.samplePeriod;
var magSamplePeriod = cfg.mpu9250.samplePeriodMagnetometer;
var sensorData = {};

var lastGPSPosition;
var lastMagReadTime = 0;
var lastCompasRawData = {};

function collectData() {

    var startTime = new Date().getTime();
    var readFinishTime;

    // Don't capture the magnetometer every sample, only once every magSamplePeriod.
    var getSampleFn;
    if (startTime - lastMagReadTime >= magSamplePeriod) {
        // DO read magnetometer
        lastMagReadTime = startTime;
        getSampleFn = imu.getMotion9Async;
    } else {
        // Don't read magnetometer
        getSampleFn = imu.getMotion6Async;
    }

    getSampleFn(function (err, sensorDataArray) {
        readFinishTime = new Date().getTime();
        if (err) {
            logger.error('asyncResult():', err);
            sendError();
            setTimeout(collectData, sensorSamplePeriod);
        } else {
            sensorData = {
                accel: {
                    x: sensorDataArray[0],
                    y: sensorDataArray[1],
                    z: sensorDataArray[2]
                },
                gyro: {
                    x: sensorDataArray[3],
                    y: sensorDataArray[4],
                    z: sensorDataArray[5]
                }
            };

            // Do transformations to get the sensors aligned with the the body.  Accel and gyro are on the same axis.
            // Magnetometer is (strangely) using a different axis.
            sensorData.accel = transformAccelGyro(sensorData.accel);
            sensorData.gyro = transformAccelGyro(sensorData.gyro);

            // Only read mag data if it's available
            if (sensorDataArray.length > 6) {
                sensorData.compassRaw = {
                    x: sensorDataArray[6],
                    y: sensorDataArray[7],
                    z: sensorDataArray[8]
                };
                sensorData.compassRaw = transformMag(sensorData.compassRaw);
            }

            enrichSensorData();
            sendSensorData();
            logger.info('STATUS:' + JSON.stringify(sensorData));
            setTimeout(collectData, sensorSamplePeriod - sensorData.elapsedTime);
        }
    });

    /**
     * Transformation:
     *  - Rotate around Z axis 180 degrees
     *  - Rotate around X axis -90 degrees
     * @param  {object} s {x,y,z} sensor
     * @return {object}   {x,y,z} transformed
     */
    function transformAccelGyro(s) {
        return {
            x: -s.x,
            y: s.z,
            z: s.y
        };
    }

    /**
     * Transformation: to get magnetometer aligned
     * @param  {object} s {x,y,z} sensor
     * @return {object}   {x,y,z} transformed
     */
    function transformMag(s) {
        return {
            x: -s.y,
            y: -s.z,
            z: s.x
        };
    }

    function enrichSensorData() {
        sensorData.timestamp = readFinishTime;
        sensorData.elapsedTime = readFinishTime - startTime;
        sensorData.gps = {
            speed: gps.getSpeedData(),
            position: gps.getPositionData()
        };
        if (sensorData.gps.position) {
            lastGPSPosition = {
                latitude: util.round(sensorData.gps.position.latitude, 6),
                longitude: util.round(sensorData.gps.position.longitude, 6)
            };
        }
        if (sensorData.compassRaw) {
            sensorData.compass = calcHeadingDeg(sensorData.compassRaw);
        }
        sensorData.servo = {
            sail: lastSailValue,
            rudder: lastRudderValue
        };
        if (windvane) {
            sensorData.windvane = windvane.getStatus();
        }
    }

    // Emit data at the statusToSend update rate
    function sendSensorData() {
        if (sensorData.compassRaw) {
            lastCompasRawData = sensorData.compassRaw;
        }
        if (!okayToSendData()) return;
        var dataToSend = {
            gyro: util.roundVector(sensorData.gyro, 6),
            accel: util.roundVector(sensorData.accel, 7),
            gps: lastGPSPosition,
            time: readFinishTime,
            compassRaw: util.roundVector(lastCompasRawData, 3),
            windvane: sensorData.windvane
        };
        toy.status(dataToSend);
        // logger.debug(dataToSend);
    }

    function sendError(err) {
        if (!okayToSendData()) return;
        toy.status({ error: err });
    }

    function okayToSendData() {
        var elapsedTime = readFinishTime - lastStatusSendTime;
        if (elapsedTime < cfg.webRemoteControl.updateRate) {
            return false;
        }
        lastStatusSendTime = readFinishTime;
        return true;
    }

    /**
     * Calculate True North heading.
     * @param  {[type]} mag [description]
     * @return {[type]}     [description]
     */
    function calcHeadingDeg(mag) {
        var headingDeg = Math.atan2(mag.y, mag.x) * 180 / Math.PI;
        headingDeg += declinationDeg;

        if (headingDeg < -180) {
            headingDeg += 360;
        } else if (headingDeg > 180) {
            headingDeg -= 360;
        }

        return headingDeg;
    }

}


/*******************************************************************************
 *                                                                             *
 *                             Communication Code                              *
 *                                                                             *
 *         - Listen to commands from the controller.                           *
 *         - Send status updates (sensor data) to the controller / listeners   *
 *                                                                             *
 *******************************************************************************/

// Set up the two servos.
var Servo = require('./Servo');
var servoSail = new Servo(obs, cfg.servos.sail, function () {});
var servoRudder = new Servo(obs, cfg.servos.rudder, function () {});

var wrc = require('web-remote-control');
var wrcOptions = { proxyUrl: cfg.webRemoteControl.url,
                   channel: cfg.webRemoteControl.channel,
                   udp4: true,
                   tcp: false,
                   log: logger.debug };
logger.debug(wrcOptions);
var windvane;
if (cfg.webRemoteControl.useNetworkDiscovery) {
    var DISCOVERY_PROXY_NAME = 'web-remote-control-proxy';
    var polo = require('polo');
    var apps = polo();
    apps.put({
        name: 'sailboat',
        port: 31234
    });

    apps.on('up', function (name) {
        if (name === DISCOVERY_PROXY_NAME) {
            wrcOptions.proxyUrl = apps.get(name).host;
            initToyToProxyCommunication();
            var WindvaneComms = require('./WindvaneComms');
            windvane = new WindvaneComms(wrcOptions, logger);
        }
    });

} else {
    initToyToProxyCommunication();
}

var toy = { status: function() {} };  // dummy function for now... until registered
function initToyToProxyCommunication() {

    // Don't initialise twice
    if (toy && toy.ping) return;

    toy = wrc.createToy(wrcOptions);

    // Should wait until we are registered before doing anything else
    toy.on('register', handleRegistered);

    // Ping the proxy and get the response time (in milliseconds)
    toy.ping(handlePing);

    // Listens to commands from the controller
    toy.on('command', handleCommand);

    toy.on('error', logger.error);
}

function handleCommand(command) {

    switch (command.action) {
        case 'note':
            logger.info('NOTE:' + JSON.stringify(command.note));
            break;
        case 'move':
            actionMove(command);
            break;
        default:
            logger.error('ERROR - invalid command', JSON.stringify(command));
    }

}

function handlePing(time) {
    if (time > 0) {
        logger.info('COMMS:Ping time to proxy (ms):', time);
    }
}

function handleRegistered() {
    logger.info('COMMS:Registered with proxy server:', cfg.webRemoteControl.url);
}

// This function gets called when we receive a 'command' from the controller.
// It will move the servos respectively.
function actionMove(command) {

    lastSailValue = adjust(command.servoSail);
    lastRudderValue = adjust(command.servoRudder);

    servoSail.set(lastSailValue, getServoSetCB('sail'));
    servoRudder.set(lastRudderValue, getServoSetCB('rudder'));

    function adjust(val) {
        val += 1.01;
        val *= 0.075;
        return val;
    }

    function getServoSetCB(servo) {
        return function servoSetCB(err) {
            if (err) {
                logger.error('servoSetCB: error for the ' + servo + ' servo: ', err);
                return;
            }
        };
    }
}

/********************************************************************************************
 *
 *                                      Let the show begin!
 *
 ********************************************************************************************/

collectData();
