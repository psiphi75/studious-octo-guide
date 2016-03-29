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

/*******************************************************************************
 *                                                                             *
 *          Configuration settings - need to be customised to requirements     *
 *                                                                             *
 *******************************************************************************/

var WRC_URL = '192.168.7.2';          // The URL of the web-remote-control proxy.
var WRC_STATUS_UPDATE_RATE = 500;     // How often we send a status update over the network (milliseconds)
var SENSOR_SAMPLE_RATE = 20;          // How often we check the sensor samples (milliseconds)
//var WRC_CHANNEL = 'SomEraNdOmvAlU3';  // The channel we operate on

var SERVO_PIN_1 = 'P9_16';
var SERVO_PIN_2 = 'P8_19';


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

var Gyroscope = require('gyroscope-itg3200');
var gyro = new Gyroscope(2, { sampleRate: SENSOR_SAMPLE_RATE, i2c: i2c });

var Compass = require('compass-hmc5883l');
var compass = new Compass(1);   // This is enabled at boot time

var MMA7660fc = require('accelerometer-mma7660fc');
var accelerometer = new MMA7660fc(2);

var Serialgps = require('super-duper-serial-gps-system');
var gps = new Serialgps('/dev/ttyO1', 9600);


/*******************************************************************************
 *                                                                             *
 *                           Sensor collection code                            *
 *                                                                             *
 *******************************************************************************/

var lastStatusUpdateTime = 0;

// Need to calibrate the gyro first, then we can collect data.
gyro.calibrate(start);
function start() {
    collectData();
}

/**
 * This will asyncronously retreive the sensor data (gyro, accel and compass).
 * GPS data is not included since it is retreived only every second.
 */
function collectData() {

    var startTime = new Date().getTime();

    async.parallel({
        gyro: gyro.getValues.bind(gyro),
        accel: accelerometer.getValues.bind(accelerometer),
        compass: function (callback) {
            compass.getHeadingDegrees('x', 'y', callback);
        },
        compassRaw: compass.getRawValues.bind(compass),
    }, function asyncResult(err, values) {

        if (err) {
            console.error('asyncResult():', err);
            return;
        }

        // console.log(values);
        var status = {
            gyro: util.roundVector(values.gyro, 1),
            accel: util.roundVector(values.accel, 1),
            compass: util.round(values.compass, 1),
            compassRaw: util.roundVector(values.compassRaw, 0),
            gps: lastGPS
        };

        var now = new Date().getTime();
        var elapsedTime = now - startTime;

        if (SENSOR_SAMPLE_RATE - elapsedTime <= 0) {
            collectData();
        } else {
            setTimeout(collectData, SENSOR_SAMPLE_RATE - elapsedTime);
        }

        // Emit data
        if (now - lastStatusUpdateTime > WRC_STATUS_UPDATE_RATE) {

            lastStatusUpdateTime = now;
            toy.status(status);

        }

        var outputStr = now + '';
        outputStr += '\t' + util.vToStr(status.gyro);
        outputStr += '\t' + util.vToStr(status.accel);
        outputStr += '\t' + status.compass;
        outputStr += '\t' + util.vToStr(status.compassRaw);
        outputStr += '\t' + util.gpsToStr(status.gps);
        console.log(outputStr);
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
                        //   channel: WRC_CHANNEL,
                          udp4: false,
                          tcp: true });

// Should wait until we are registered before doing anything else
toy.on('register', function() {
    console.log('Registered with proxy server:', WRC_URL);
});

// Ping the proxy and get the response time (in milliseconds)
toy.ping(function (time) {
    console.log('Ping time to proxy (ms):', time);
});

// Listens to commands from the controller
toy.on('command', function(command) {
    var val1 = adjust(command.x);
    var val2 = adjust(command.y);

    servo1.set(val1, getServoSetCB(1, val1));
    servo2.set(val2, getServoSetCB(2, val2));

    // console.log('The controller sent me this command: ', command);
    function adjust(val) {
        val += 1.01;
        val *= 0.075;
        return val;
    }

    function getServoSetCB(servoNum, val) {
        return function servoSetCB(err) {
            if (err) {
                console.error('servoSetCB: error for servo ' + servoNum + ': ', servoNum);
                return;
            }
            console.log('Servo ' + servoNum + ': ', val);
        };
    }
});

toy.on('error', function(err) {
    console.error(err);
});
