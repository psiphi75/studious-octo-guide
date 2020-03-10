/* *******************************************************************
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
 ******************************************************************* */

'use strict';

// #define GPIO_POWER_PIN	2,16	//gpio2.16 P8.36

/* Using roboticscape
const rc = require('roboticscape');
rc.initialize();
rc.servo('ENABLE')
rc.servo('POWER_RAIL_ENABLE')

rc.servo(0,1.0)  // Where param1 = servo # (0 .. 8) and param2 = servo amount (-1.5 .. 1.5)

code can be found here:
https://github.com/jadonk/node-roboticscape/blob/769167ba44471f77736dc914d3f820a4acba3a26/rc-node-bindings.cc#L333-L369

*/

const rc = require('roboticscape');

const HOLD_SERVO_INTERVAL = 100;
let initDone = false;
(function() {
    if (initDone) return;
    initDone = true;
    rc.initialize();
    rc.servo('ENABLE');
    rc.servo('POWER_RAIL_ENABLE');
    console.log('Initialised Robotics Cape');
})();

/**
 * Initialise the servo / PWM for the BeagleBone Green / Black.
 *
 * @param {string} name - The name of the servo.
 * @param {object} cfg - The config {min, center, max, channel}.
 */
function Servo(name, cfg) {
    this.name = name;
    this.channel = cfg.channel;
    this.scalar = {
        min: cfg.scalar.min,
        center: cfg.scalar.center,
        max: cfg.scalar.max,
    };

    // Start the servo in the middle
    this.value = 0.0;
    console.log(`Servo ${this.name}: ${JSON.stringify(this.scalar)} -> ${this.value}`);
    this.setValue(0.0);
    this.intervalHandle = undefined;
}

/**
 * Set the value of a servo.
 *
 * @param {number} unscaledValue - The value to set the servo to.
 */
Servo.prototype.setValue = function(unscaledValue) {
    // Keep the servo in position
    //   - This is a bit of a workaround, idealy the servo will hold it's position, but
    //     roboticscape is a bit limited.
    if (!this.intervalHandle) {
        this.intervalHandle = setInterval(() => {
            rc.servo(this.channel, this.value);
            console.log(`Servo ${this.name} (${this.channel}): ${unscaledValue} -> ${this.value}`);
        }, HOLD_SERVO_INTERVAL);
    }

    this.value = scale(unscaledValue, this.scalar);
};

Servo.prototype.getLastValue = function() {
    return this.value;
};

/**
 * Relaxes the servo - such that its essentially off.
 */
Servo.prototype.relax = function() {
    clearInterval(this.intervalHandle);
    this.intervalHandle = undefined;
};

/**
 * Scale the value.  Where -1 => min, 0 => center, 1 => max.
 *
 * @param value {number} - The input value.
 * @returns {number} - The scaled value - in the units of what the servo wants.
 */
function scale(value, scalar) {
    if (value < -1) value = -1;
    if (value > 1) value = 1;

    //
    // Do the scaling
    //
    let m;
    if (value >= 0) {
        m = scalar.max - scalar.center;
    } else {
        m = scalar.center - scalar.min;
    }
    value = value * m + scalar.center;

    return value;
}

module.exports = Servo;
