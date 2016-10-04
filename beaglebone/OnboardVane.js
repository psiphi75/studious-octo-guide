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

// process.env.AUTO_LOAD_CAPE = 0;
// var obs = require('octalbonescript');
// obs.loadCape('cape-universaln');
// obs.loadCape('BB-ADC');
//
// var pin = 'P9_33'; //the pin to operate on
// setInterval(function() {
//     obs.analogRead(pin, function (err, value) {
//         if (err) {
//             console.error(err);
//             return;
//         }
//         console.log(value); // value is floating point number between 0 and 1.
//     });
// }, 250);

var util = require('sailboat-utils/util');

var RATE = 100;

function OnboardVane(obs) {

    var aparentWindHeading = 0;
    var pin = 'P9_33'; //t he pin to operate on
    var lastBoatHeading;
    var s = 0;
    var c = 0;
    var actualWindHeading = 0;
    setInterval(function() {
        obs.analogRead(pin, function (err, value) {
            if (err) {
                console.error(err);
                return;
            }
            if (util.isNumeric(value)) {
                aparentWindHeading = findTuneCalibration(value);
                var w = util.toRadians(util.wrapDegrees(lastBoatHeading + aparentWindHeading + 180));

                // Technologies for Autonomous Sailing: Wings and Wind Sensors: Mark Neal, Colin Sauzé and Barry Thomas
                s = s + (Math.sin(w) - s) / RATE;
                c = c + (Math.cos(w) - c) / RATE;
                actualWindHeading = util.toDegrees(Math.atan2(s, c));
                // console.log('aparentWindHeading, lastBoatHeading, w, s, c, actualWindHeading', aparentWindHeading.toFixed(3), lastBoatHeading.toFixed(3), w.toFixed(3), s.toFixed(3), c.toFixed(3), actualWindHeading.toFixed(3))
            }
        });
    }, 100);


    return {
        getStatus: function(boatHeading) {
            lastBoatHeading = boatHeading;
            return {
                heading: actualWindHeading,
                speed: 2
            };
        }
    };

}


function findTuneCalibration(val) {

    if (typeof val !== 'number' || isNaN(val)) {
        return 0;
    }

    console.log(val, 'aw -->', findValue(val));
    return findValue(val);
}

function findValue(input) {

    var osPair1 = offsetMap[0];
    var in1 = osPair1[1];
    for (var i = 1; i < offsetMap.length; i += 1) {
        var osPair2 = offsetMap[i];
        var in2 = osPair2[1];
        if (in1 <= input && input <= in2) {
            var fraction = (in1 - input) / (in1 - in2);
            var out1 = osPair1[0];
            var out2 = osPair2[0];
            if (out2 < out1) out1 -= 360;
            var portion = (out2 - out1) * fraction;
            var output = osPair1[0] + portion;
            return Math.round(util.wrapDegrees(output) * 10) / 10;
        }
        osPair1 = osPair2;
        in1 = in2;
    }
    console.log('Did not find the value: ', input);
    return NaN;
}


/**
 * Finer grain calibration.
 *
 * [output, input]
 */
var offsetMap = [
    [0, 0.1944],
    [90, 0.4335],
    [180, 0.6696],
    [-90, 0.8942],
    [-75.55, 0],
    [284.45, 0.901],
];

// Order matters, we need input in ascending order (-180 to 180)
offsetMap.sort(function(a, b) {
    return a[1] < b[1] ? -1 : 1;
});

module.exports = OnboardVane;
