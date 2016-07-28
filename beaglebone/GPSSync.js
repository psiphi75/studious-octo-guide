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
var async = require('async');

function GPSSync(cfg) {

    this.gps1 = new GPS(cfg.gps['1'].serialport, cfg.gps.baudrate);
    this.gps2 = new GPS(cfg.gps['2'].serialport, cfg.gps.baudrate);
    this.interval = (1000 / cfg.gps.updateRate) + 50;  // Convert to milliseconds

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

    // Do the capture
    async.parallel({
        '1': funFactory(this.gps1),
        '2': funFactory(this.gps2)
    }, function handleGPSCapture(err, results) {
        self.position = bestGPS(results);
        console.log('GPSS: "' + gpsQualityType + '"', err, JSON.stringify(results));
        setTimeout(self.capture.bind(self), 0);
    });

    function funFactory(gpsDevice) {
        return function (callback) {

            //
            // Listen to the GPS device
            //
            gpsDevice.once('position', handleEvent);
            function handleEvent(position) {
                // We get here and GPS capture is success
                callback(null, position);
                clearTimeout(hST);
            }

            //
            // Create a timeout for waiting for GPS
            //
            var hST = setTimeout(function() {
                // We get here and GPS capture has failed
                callback(null, null);
                gpsDevice.removeListener('position', handleEvent);
            }, self.interval);
        };
    }

    function bestGPS(gpsObj) {
        gpsQualityType = 'either is null';
        var g1 = gpsObj['1'];
        var g2 = gpsObj['2'];
        if (g1 === null) return g2;
        if (g2 === null) return g1;

        // Test gps quality
        gpsQualityType = 'either has better quality';
        var q1 = qualityScale(g1);
        var q2 = qualityScale(g2);
        if (q1 < q2) return q1;
        if (q2 < q1) return q2;

        // Test HDOP
        gpsQualityType = 'either has better hdop';
        if (q1.hdop < q2.hdop) return q1;
        if (q2.hdop < q1.hdop) return q2;

        // Test if the GPS value has changed
        gpsQualityType = 'either has not changed';
        if (g1.sameCounter < g2.sameCounter) return g1;
        if (g2.sameCounter < g1.sameCounter) return g2;

        // GPS Signal must be good - use average
        gpsQualityType = 'Both are good';
        g1.latitude = 0.5 * (g1.latitude + g2.latitude);
        g1.latitude = 0.5 * (g1.longitude + g2.longitude);
        return g1;

        function qualityScale(g) {
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
