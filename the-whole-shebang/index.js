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

var WRC_URL = config.get('web-remote-control.url');
var WRC_CHANNEL = config.get('web-remote-control.channel');
var WRC_STATUS_UPDATE_RATE = config.get('web-remote-control.update-rate');

var SENSOR_SAMPLE_RATE = config.get('sample-rate');

var SERVO_PIN_1 = config.get('servos.1');
var SERVO_PIN_2 = config.get('servos.2');


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
console.log('Starting the-whole-shebang:');
console.log('--- CONFIG START ---');
console.log(JSON.stringify(config));
console.log('--- CONFIG END ---');


/*******************************************************************************
 *                                                                             *
 *                           Load necessary libraries                          *
 *                                                                             *
 *******************************************************************************/

/* Set this for octalbonescript such that it does load capes automatically */
if (typeof process.env.AUTO_LOAD_CAPE === 'undefined') {
    process.env.AUTO_LOAD_CAPE = 0;
}
var obs = require('octalbonescript');
var i2c = require('i2c-bus');
var async = require('async');
var util = require('./util');

obs.i2c.open('/dev/i2c-1', 0x1e, function() {
    }, function(error) {
        if (error) {
            console.error(error);
        }
    }
);

var Gyroscope = require('gyroscope-itg3200');
var gyro = new Gyroscope(2, {
    i2c: i2c,
    sampleRate: SENSOR_SAMPLE_RATE
});

var Compass = require('compass-hmc5883l');
var compass = new Compass(1, {
    i2c: i2c,
    sampleRate: '30',
    scale: '0.88',
    declination: declination
});

var MMA7660fc = require('accelerometer-mma7660fc');
var accelerometer = new MMA7660fc(2, { i2c: i2c });

var Serialgps = require('super-duper-serial-gps-system');
var gps = new Serialgps('/dev/ttyO1', 9600);


/*******************************************************************************
 *                                                                             *
 *                           Sensor collection code                            *
 *                                                                             *
 *******************************************************************************/

var lastStatusUpdateTime = 0;
var lastServo1Value;
var lastServo2Value;


// Need to calibrate the gyro first, then we can collect data.
gyro.calibrate(function () {
    collectData();
});


/**
 * This will asyncronously retreive the sensor data (gyro, accel and compass).
 * GPS data is not included since it is retreived only every second.
 */
function collectData() {

    var startTime = new Date().getTime();

    async.parallel({
        gyro: gyro.getValues.bind(gyro),
        accel: accelerometer.getValues.bind(accelerometer),
        compassRaw: compass.getRawValues.bind(compass)
    }, function asyncResult(err, values) {

        var status;
        if (err) {
            console.error('asyncResult():', err);
            status = {
                error: err
            };
        } else {

            values.compass = compass.calcHeadingDegrees('x', 'z', values.compassRaw);
            status = {
                gyro: util.roundVector(values.gyro, 1),
                accel: util.roundVector(values.accel, 1),
                compass: util.round(values.compass, 1),
                compassRaw: util.roundVector(values.compassRaw, 0),
                gps: lastGPS
            };
        }

        var now = new Date().getTime();
        var elapsedTime = now - startTime;
        setTimeout(collectData, SENSOR_SAMPLE_RATE - elapsedTime);

        // Emit data at the status update rate
        if (now - lastStatusUpdateTime > WRC_STATUS_UPDATE_RATE) {

            lastStatusUpdateTime = now;
            toy.status(status);

        }

        if (!status.error) {
            var outputStr = now + '';
            outputStr += '\t' + util.round(lastServo1Value, 5);
            outputStr += '\t' + util.round(lastServo2Value, 5);
            outputStr += '\t' + util.vToStr(util.roundVector(values.gyro, 6));
            outputStr += '\t' + util.vToStr(util.roundVector(values.accel, 6));
            outputStr += '\t' + util.round(values.compass, 5);
            outputStr += '\t' + util.vToStr(util.roundVector(values.compassRaw, 6));
            outputStr += '\t' + util.gpsToStr(values.gps);
            console.log(outputStr);
        }
    });
}

// monitor for GPS data
var lastGPS = null;
gps.on('position', function(data) {
    lastGPS = data;
});


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
//                          log: function() {}
});

// Should wait until we are registered before doing anything else
toy.on('register', function() {
    console.log('Registered with proxy server:', WRC_URL);
});

// Ping the proxy and get the response time (in milliseconds)
toy.ping(function (time) {
    if (time > 0) {
        console.log('Ping time to proxy (ms):', time);
    }
});

// Listens to commands from the controller
toy.on('command', function(command) {

    var val1 = adjust(command.x);
    var val2 = adjust(command.y);

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
                console.error('servoSetCB: error for servo ' + servoNum + ': ', servoNum);
                return;
            }
        };
    }
});

toy.on('error', function(err) {
    console.error(err);
});
