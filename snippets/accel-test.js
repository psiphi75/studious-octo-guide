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

// This will load the accelerometer library.
var MMA7660FC = require('accelerometer-mma7660fc');

// The initialiser is the i2c bus number that the accelerometer is on.
var accelerometer = new MMA7660FC(2);

// How often to poll the accelerometer (in milliseconds)
var INTERVAL = 100;

// setInterval will run a function every 100 ms to get values from the
// accelerometer.
setInterval(accelGetValues, INTERVAL);


// Get the accelerometer values - the values object will be returned
// with x, y, z values which represent the G Force in the respective
// direction.
function accelGetValues() {

    accelerometer.getValues(function (err, values) {
        if (err) {
            console.error(err);
            return;
        }

        // Print out the x, y, z values which we received.
        console.log(values);
    });

}
