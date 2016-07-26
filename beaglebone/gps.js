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

function GPS(serialPort, baudRate) {

    var self = this;
    var gpsModule = require('gps');
    var gps = new gpsModule();

    var SerialPort = require('serialport');
    var port = new SerialPort.SerialPort(serialPort, {
        baudrate: baudRate,
        parser: SerialPort.parsers.readline('\r\n')
    });

    // FIXME: This code needs to be removed
    var lastGPS = {
        sameCounter: -1,
        notValid: -1
    };

    this.speedData = null;
    this.positionData = null;

    gps.on('data', function(data) {
        if (data.lat === null || (data.lat === 0 && data.lon === 0)) {
            lastGPS.notValid += 1;
            return;
        }
        if (!data.valid) {
            lastGPS.notValid += 1;
            return;
        }
        if (data.type === 'RMC') {
            self.speedData = {
                time: data.time.getTime(),  // convert to parsable time in milliseconds
                speed: convert_km_per_hour_to_meters_per_second(data.speed),  // convert from km/h to m/s
                direction: data.track       // Degrees
            };
        }
        if (data.type === 'GGA') {
            self.positionData = {
                time: data.time.getTime(), // convert to parsable time in milliseconds
                latitude: data.lat,
                longitude: data.lon,
                altitude: data.alt,         // Meters
                quality: data.quality,
                hdop: data.hdop
            };
            if (self.positionData.latitude === lastGPS.latitude && self.positionData.longitude === lastGPS.longitude) {
                lastGPS.sameCounter += 1;
            } else {
                lastGPS.sameCounter = 0;
            }
            lastGPS.latitude = self.positionData.latitude;
            lastGPS.longitude = self.positionData.longitude;
        }
    });

    port.on('data', function(data) {
        console.log('DEBUG GPS (same=' + lastGPS.sameCounter + ', !valid=' + lastGPS.notValid + ')', data);
        gps.update(data);
    });

}

function convert_km_per_hour_to_meters_per_second(kmh) {
    return kmh / 3.6;
}

GPS.prototype.getSpeed = function () {
    var retVal = this.speedData;
    this.speedData = null;
    return retVal;
};

GPS.prototype.getPosition = function () {
    var retVal = this.positionData;
    this.positionData = null;
    return retVal;
};


module.exports = GPS;
