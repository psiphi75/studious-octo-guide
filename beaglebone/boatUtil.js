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

var fn = {
    calcApparentWind: function(windSpeed, windHeading, boatSpeed, boatHeading) {
        // https://en.wikipedia.org/wiki/Apparent_wind

        // Note: wind "direction" from windvane is where the wind is coming from.  We change this to the other direction
        windHeading = util.wrapDegrees(180 + windHeading);

        var trueWindVec = util.createVector(windSpeed, util.toRadians(windHeading));
        var boatVec = util.createVector(boatSpeed, util.toRadians(boatHeading));

        // The ApparentWind vector
        var x = boatVec.x + trueWindVec.x;
        var y = boatVec.y + trueWindVec.y;

        var awHeading = util.wrapDegrees(90 - util.toDegrees(Math.atan2(y, x)));
        var awHeadingBoat = util.wrapDegrees(boatHeading - awHeading);
        var awSpeed = Math.sqrt(x * x + y * y);

        return {
            heading: awHeading,
            headingToBoat: awHeadingBoat,
            speed: awSpeed
        };
    },
    calcNextPosition: function(oldLat, oldLong, newSpeed, newHeading, drift, time) {
        // FIXME: Need to include drift in speed and heading
        return util.getNextLatLongFromVelocity(oldLat, oldLong, newSpeed, newHeading, time.delta);
    }
};

module.exports = fn;
