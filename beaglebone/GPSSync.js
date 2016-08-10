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

var GPS = require('./GPS');

function GPSSync(cfg) {

    this.gps = {
        '1': {
            gps: new GPS(cfg.gps['1'].serialport, cfg.gps.baudrate),
            tmpPostion: null,
        },
        '2': {
            gps: new GPS(cfg.gps['2'].serialport, cfg.gps.baudrate),
            tmpPostion: null,
        }
    };
    this.interval = (1000 / cfg.gps.updateRate) - 50;  // Convert to milliseconds

    this.capture();
}

GPSSync.prototype.getPosition = function() {
    var pos = this.position;
    this.position = null;
    return pos;
};

GPSSync.prototype.capture = function() {

    var self = this;
    var gpsQualityType; // Stores the GPS Quality type.
    var numGPSevents = 0;

    setEventHandler('1');
    setEventHandler('2');

    function setEventHandler(gpsNum) {
        self.gps[gpsNum].gps.on('position', function(position) {
            handleEvent('position', gpsNum, position);
        });
    }

    function handleEvent(evType, gpsNum, position) {
        if (gpsNum) {
            self.gps[gpsNum].tmpPosition = position;
            numGPSevents += 1;
        }

        if (evType === 'timeout' || numGPSevents === 2) {
            console.log('GPSS: evType', evType);
            wrapUp();
        } else {
            // We have our first event.  Hence trigger the timeout for the next event.
            setTimeout(timeoutFunction, self.interval);
        }
    }

    function timeoutFunction() {
        handleEvent('timeout');
    }

    function wrapUp() {

        self.position = bestPostion(self.gps['1'].tmpPosition, self.gps['2'].tmpPosition);
        console.log('GPSS: "' + gpsQualityType + '"', JSON.stringify([self.gps['1'].tmpPosition, self.gps['2'].tmpPosition]));
        self.gps['1'].tmpPosition = null;
        self.gps['2'].tmpPosition = null;

        clearTimeout(timeoutFunction);
        numGPSevents = 0;

    }

    function bestPostion(pos1, pos2) {
        gpsQualityType = 'either is null';
        if (pos1 === null) return pos2;
        if (pos2 === null) return pos1;

        // Test gps quality
        gpsQualityType = 'either has better quality';
        var q1 = qualityScale(pos1);
        var q2 = qualityScale(pos2);
        if (q1 < q2) return q1;
        if (q2 < q1) return q2;

        // Test HDOP
        gpsQualityType = 'either has better hdop';
        if (q1.hdop < q2.hdop) return q1;
        if (q2.hdop < q1.hdop) return q2;

        // Test if the GPS value has changed
        gpsQualityType = 'either has not changed';
        if (pos1.sameCounter < pos2.sameCounter) return pos1;
        if (pos2.sameCounter < pos1.sameCounter) return pos2;

        // GPS Signal must be good - use average
        gpsQualityType = 'Both are good';
        pos1.latitude = 0.5 * (pos1.latitude + pos2.latitude);
        pos1.longitude = 0.5 * (pos1.longitude + pos2.longitude);
        return pos1;

        function qualityScale(g) {
            if (!g) return 99;
            switch (g.quality) {
                case 'pps-fix':     // valid PPS (Precise Positioning Service) fix
                    return 1;
                case 'fix':         // valid SPS (Standard Positioning Service) fix
                    return 2;
                case 'dgps-fix':    // valid DGPS (Differential GPS) fix
                    return 3;
                default:
                    return 9;
            }
        }
    }

};


module.exports = GPSSync;
