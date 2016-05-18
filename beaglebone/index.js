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

var config = require('config');
var logger = require('./logger');

var WRC_URL = config.get('web-remote-control.url');
var WRC_CHANNEL = config.get('web-remote-control.channel');
var WRC_STATUS_UPDATE_RATE = config.get('web-remote-control.update-rate');

var SERVO_PIN_1 = config.get('servos.1');
var SERVO_PIN_2 = config.get('servos.2');

var SENSOR_SAMPLE_RATE = config.get('sensors.sample-rate');
var GPS_SERIAL = config.get('sensors.gps.serialport');
var GPS_BAUDRATE = config.get('sensors.gps.baudrate');


// Required for the compass to determine true north (from the magnetic
// declination).  The latitude / longitude values can be approximate.
var DEFAULT_LATITUDE = config.get('location.latitude');
var DEFAULT_LONGITUDE = config.get('location.longitude');
var declination = 0;

if (DEFAULT_LATITUDE && DEFAULT_LONGITUDE) {
    var geomagnetism = require('geomagnetism');
    var geo = geomagnetism.model().point([DEFAULT_LONGITUDE, DEFAULT_LATITUDE]);
    declination = geo.decl;
}


/*
 * Output config settings - we will pick these up later.
 */
var header = config.util.cloneDeep(config);
header.timestamp = new Date().getTime();
header.fields = ['time', 'servo.1', 'servo.2',
                 'gyro.x', 'gyro.y', 'gyro.z',
                 'accel.x', 'accel.y', 'accel.z',
                 'compass.heading', 'compass.x', 'compass.y', 'compass.z',
                 'gps.position.latitude', 'gps.position.longitude', 'gps.position.altitude', 'gps.position.time', 'gps.position.quality', 'gps.position.hdop', ];
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
var async = require('async');
var util = require('./util');

obs.i2c.open('/dev/i2c-1', 0x1e, function() {}, function(error) {
    if (error) {
        logger.error(error);
    }
    logger.debug('i2c channel openned');
});

var sensors = {
    gyro: null,
    compass: null,
    accelerometer: null,
    gps: null
};

function initSensor(name, moduleName, param1, param2, callback) {
    var SensorModule = require(moduleName);
    var sens;

    try {
        if (typeof param2 === 'undefined') {
            sens = new SensorModule(param1);
        } else {
            sens = new SensorModule(param1, param2);
        }
        sensors[name] = sens;

        if (callback) callback();
    } catch (ex) {
        logger.error('Unable to init: ', name, ex);
        setTimeout(function () {
            initSensor(name, moduleName, param1, param2);
        }, 1000);
    }
}


initSensor('accelerometer', 'accelerometer-mma7660fc', 1);
initSensor('compass', 'compass-hmc5883l', 2, {
    sampleRate: '30',
    scale: '0.88',
    declination: declination
});
initSensor('gps', './gps', GPS_SERIAL, GPS_BAUDRATE);
initSensor('gyro', 'gyroscope-itg3200', 2, { sampleRate: SENSOR_SAMPLE_RATE }, function() {
    // Need to calibrate the gyro first, then we can collect data.
    sensors.gyro.calibrate(function () {
        // Only then we can begin collecting data
        collectData();
    });
});


/*******************************************************************************
 *                                                                             *
 *                           Sensor collection code                            *
 *                                                                             *
 *******************************************************************************/

var lastStatusSendTime = 0;
var lastServo1Value;
var lastServo2Value;


/**
 * This will asyncronously retreive the sensor data (gyro, accel and compass).
 * GPS data is not included since it is retreived only every second.
 */
var lastGPSPosition;
function collectData() {

    // Make sure sensors have been initalised
    for (var sensor in sensors) {
        if (!sensors[sensor]) {
            logger.debug(sensor + ': not yet avialable');
            setTimeout(collectData, 1000);
            return;
        }
    }

    var startTime = new Date().getTime();
    var now;

    async.parallel({
        gyro: sensors.gyro.getValues.bind(sensors.gyro),
        accel: sensors.accelerometer.getValues.bind(sensors.accelerometer),
        compassRaw: sensors.compass.getRawValues.bind(sensors.compass)
    }, function asyncResult(err, sensorData) {
        now = new Date().getTime();
        if (err) {
            logger.error('asyncResult():', err);
            sendError();
            setTimeout(collectData, SENSOR_SAMPLE_RATE);
        } else {
            enrichSensorData(sensorData);
            sendSensorData(sensorData);
            logger.info('STATUS:' + JSON.stringify(sensorData));
            setTimeout(collectData, SENSOR_SAMPLE_RATE - sensorData.elapsedTime);
        }

    });

    function enrichSensorData(sensorData) {
        sensorData.timestamp = now;
        sensorData.elapsedTime = now - startTime;
        sensorData.gps = {
            speed: sensors.gps.getSpeedData(),
            position: sensors.gps.getPositionData()
        };
        if (sensorData.gps.position) {
            lastGPSPosition = {
                latitude: util.round(sensorData.gps.position.latitude, 6),
                longitude: util.round(sensorData.gps.position.longitude, 6)
            };
        }
        sensorData.compass = sensors.compass.calcHeadingDegrees('x', 'z', sensorData.compassRaw);
        sensorData.servo = {
            1: lastServo1Value,
            2: lastServo2Value
        };
    }

    // Emit data at the statusToSend update rate
    function sendSensorData(sensorData) {
        if (!okayToSendData()) return;
        var dataToSend = {
            gyro: util.roundVector(sensorData.gyro, 1),
            accel: util.roundVector(sensorData.accel, 1),
            compassRaw: util.roundVector(sensorData.compassRaw, 0),
            gps: lastGPSPosition,
            time: now
        };
        toy.status(dataToSend);
        logger.debug(dataToSend);
    }

    function sendError(err) {
        if (!okayToSendData()) return;
        toy.status({ error: err });
    }

    function okayToSendData() {
        var elapsedTime = now - lastStatusSendTime;
        if (elapsedTime < WRC_STATUS_UPDATE_RATE) {
            return false;
        }
        lastStatusSendTime = now;
        return true;
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
var servo1 = new Servo(obs, SERVO_PIN_1, function () {});
var servo2 = new Servo(obs, SERVO_PIN_2, function () {});

var wrc = require('web-remote-control');
var toy = wrc.createToy({ proxyUrl: WRC_URL,
                          channel: WRC_CHANNEL,
                          udp4: true,
                          tcp: false,
                          log: logger.debug });

// Should wait until we are registered before doing anything else
toy.on('register', function() {
    logger.info('COMMS:Registered with proxy server:', WRC_URL);
});

// Ping the proxy and get the response time (in milliseconds)
toy.ping(function (time) {
    if (time > 0) {
        logger.info('COMMS:Ping time to proxy (ms):', time);
    }
});

// Listens to commands from the controller
toy.on('command', function(command) {

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

});

toy.on('error', logger.error);


function actionMove(command) {

    var val1 = adjust(command.servo1);
    var val2 = adjust(command.servo2);

    lastServo1Value = val1;
    lastServo2Value = val2;

    servo1.set(val1, getServoSetCB(1, val1));
    servo2.set(val2, getServoSetCB(2, val2));

    function adjust(val) {
        val += 1.01;
        val *= 0.075;
        return val;
    }

    function getServoSetCB(servoNum/*, val*/) {
        return function servoSetCB(err) {
            if (err) {
                logger.error('servoSetCB: error for servo ' + servoNum + ': ', servoNum);
                return;
            }
        };
    }

}
