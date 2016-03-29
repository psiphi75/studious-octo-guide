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

// This will load the gyroscope library.
var Gyroscope = require('gyroscope-itg3200');

// How often to poll the gyroscope (in milliseconds)
var INTERVAL = 100;

// The initialiser is the i2c bus number that the gyroscope is on.  We can also
// set the sample rate.
var gyro = new Gyroscope(2, { sampleRate: INTERVAL });

// The gyro needs calibration first.  During calibration it needs to be at rest.
gyro.calibrate(function () {

    // Get the accelerometer values every 100 milliseconds
    setInterval(gyroGetValues, INTERVAL);

});

// Get the gyroscope values - the values object will be returned
// with x, y, z values which represent the angular acceleration
// around the respective axis.
function gyroGetValues() {
    gyro.getValues(function (err, values) {
        if (err) {
            console.log(err);
            return;
        }
        console.log(values);
    });
}
