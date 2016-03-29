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

var b = require('octalbonescript');
var SERVO = 'P9_16';
var duty_min = 0.03;
var position = 0;
var increment = 0.02;

b.pinMode(SERVO, b.OUTPUT, function (err, result) {
	console.log(err, result);
});
updateDuty();

function updateDuty() {
    // compute and adjust duty_cycle based on desired position in range 0..1
    var duty_cycle = (position * 0.115) + duty_min;
    b.analogWrite(SERVO, duty_cycle, 60, scheduleNextUpdate);
    console.log('Duty Cycle: ', parseFloat(duty_cycle * 100).toFixed(1) + ' %');
}

function scheduleNextUpdate() {
    // adjust position by increment and reverse if it exceeds range of 0..1
    position = position + increment;
    if (position < 0) {
        position = 0;
        increment = -increment;
    } else if (position > 1) {
        position = 1;
        increment = -increment;
    }

    // call updateDuty after 200ms
    setTimeout(updateDuty, 50);
}
