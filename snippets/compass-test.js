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

// This will load the compass library.
var HMC5883L = require('compass-hmc5883l');
var compass;

// How often to poll the compass (in milliseconds)
var INTERVAL = 100;

// This is required to initialise i2c-1 - currently used for the compass.
var obs = require('octalbonescript');
obs.i2c.open('/dev/i2c-1', 0x1e, function(data) {
        console.log('data:', data);
    }, function(error) {
        if (error) {
            console.error('Error opening i2c device: ', error.message);
            return;
        }

        // The i2c bus has been initialised once we get here.
        console.log('Loaded i2c-1.');

        // Connect with the HMC5883L compass on i2c bus number 1
        compass = new HMC5883L(1);

        // setInterval will run a function every 100 ms to get values from
        // the compass.
        setInterval(compassGetValues, INTERVAL);

    }
);


function compassGetValues() {

    // Get the compass values between x and y.
    compass.getHeadingDegrees('x', 'y', function (err, heading) {
        if (err) {
            console.error('There was an error from the module: ', err);
            return;
        }
        console.log('Heading:', heading);
    });

    // Get the raw values
    compass.getRawValues(function (err, values) {
        if (err) {
            console.error('There was an error from the module: ', err);
            return;
        }
        console.log('Raw x,y,z values: ', values);
    });

}
