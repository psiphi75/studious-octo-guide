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
 * @param {object}   obs      The octalbonescript object.
 * @param {string}   pin      The BeagleBone GPIO (e.g. 'P9_16').
 * @param {Function} callback The callbak for when the pin is initalised.
 */
function Servo(obs, pin, callback) {

    if (typeof obs !== 'object' || typeof obs.pinMode !== 'function') {
        callback(null, 'Servo: Error: Expecting octalbonescript to be defined');
    }

    this.obs = obs;
    this.pin = pin;
    this.dutyMin = 0.03;
    this.currentPosition = 0;
    this.up = false;

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
 * @param {Function} callback The callback for when the value is set.
 */
Servo.prototype.set = function (value, callback) {

    if (!this.up) {
        callback(null, 'This servo is currently not ready: ' + this.pin);
    }

    if (!callback) {
        callback = defaultCB;
    }

    this.obs.analogWrite(this.pin, value, 60, callback);
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
        callback = defaultCB;
    }

    this.obs.pinMode(this.pin, this.obs.OUTPUT, callback);
};

function defaultCB(err, data) {
    console.log(err, data);
}

module.exports = Servo;
