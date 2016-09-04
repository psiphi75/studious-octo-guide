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

/**
 * Initialise the servo / PWM for the BeagleBone Green / Black.
 * @param {string}   name     The name of the servo.
 * @param {object}   obs      The octalbonescript object.
 * @param {object}   cfg      The config {min, center, max, pin: The BeagleBone GPIO (e.g. 'P9_16')}.
 * @param {Function} callback The callbak for when the pin is initalised.
 */
function Servo(name, obs, cfg, callback) {

    if (typeof obs !== 'object' || typeof obs.pinMode !== 'function') {
        callback(null, 'Servo: Error: Expecting octalbonescript to be defined');
    }
    this.name = name;
    this.obs = obs;
    this.pin = cfg.pin;
    this.scalar = {
        min: cfg.scalar.min,
        center: cfg.scalar.center,
        max: cfg.scalar.max
    };
    this.dutyMin = 0.03;
    this.currentPosition = 0;
    this.up = false;
    this.value = 0;

    var self = this;
    this.obs.pinMode(this.pin, this.obs.OUTPUT, function(err, data) {
        if (!err) {
            self.up = true;
        }
        callback(err, data);
    });
}


/**
 * Set the value of a servo.
 * @param {number}   value    The value to set the servo to.
 */
Servo.prototype.set = function (value) {

    this.value = value;
    var scaledValue = this.scale(value);

    if (!this.up) {
        console.error('Servo.set(): This servo is currently not ready: ' + this.pin);
        return;
    }

    console.log('Servo ' + this.name, value, scaledValue, adjustPWM(scaledValue));

    var pwmWriteValue = adjustPWM(scaledValue);
    this.obs.analogWrite(this.pin, pwmWriteValue, 60, function(err) {
        if (err) {
            console.error('Servo: There was an error with a servo: ', pwmWriteValue, err);
        }
    });

    //
    // This is the default adjust function for the BeagleBone for PWM.
    //
    function adjustPWM(val) {
        val += 1.01;
        val *= 0.075;
        return val;
    }
};

Servo.prototype.getLastValue = function () {
    return this.value;
};


/**
 * Relaxes the servo - such that its essentially off.
 * @param  {Function} callback Notification for when we are done.
 */
Servo.prototype.relax = function (callback) {

    if (!this.up) {
        callback(null, 'This servo is currently not ready: ' + this.pin);
    }

    if (!callback) {
        callback = function(err) {
            if (err) console.error('Servo: There was an error with a servo:', err);
        };
    }

    this.obs.pinMode(this.pin, this.obs.OUTPUT, callback);
};


/**
 * Scale the value.  Where -1 => min, 0 => center, 1 => max.
 * @return  {number} The scaled value.
 */
Servo.prototype.scale = function (value) {

    if (value < -1) value = -1;
    if (value > 1) value = 1;

    //
    // Do the scaling
    //
    var m;
    if (value >= 0) {
        m = this.scalar.max - this.scalar.center;
    } else {
        m = this.scalar.center - this.scalar.min;
    }
    value = value * m + this.scalar.center;

    return value;

};

module.exports = Servo;
