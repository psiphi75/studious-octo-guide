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

var util = require('./util');

/**
 * Keep a track of the GPS positions and calculate the velocity.
 */
function Velocity() {
    this.speed = 0;
    this.heading = 0;
    this.lastPosition = null;
}

Velocity.prototype.calcFromPosition = function(position) {

    var zero = {
        speed: 0,
        heading: 0
    };

    if (!util.isValidGPS(position)) {
        console.log('Velocity: invalid position', position);
        return zero;
    }

    if (this.lastPosition === null) {
        this.lastPosition = util.clone(position);
        return zero;
    }

    var dt_ms = position.time - this.lastPosition.time;
    var velocity = util.getVelocityFromDeltaLatLong(position.latitude, position.longitude, this.lastPosition.latitude, this.lastPosition.longitude, dt_ms);
    this.lastPosition = util.clone(position);
    return velocity;

};

module.exports = Velocity;
