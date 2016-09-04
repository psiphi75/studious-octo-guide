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

var EventEmitter = require('events').EventEmitter;
var util = require('util');

function GPS(serialPort, baudRate) {

    var self = this;
    var gpsModule = require('gps');
    var gps = new gpsModule();

    var SerialPort = require('serialport');
    var port = new SerialPort.SerialPort(serialPort, {
        baudrate: baudRate,
        parser: SerialPort.parsers.readline('\r\n')
    });

    this.speedData = null;
    this.positionData = null;

    //
    // Listen to incoming data requests
    //
    gps.on('data', function(data) {
        if (data.lat === null || (data.lat === 0 && data.lon === 0)) {
            return;
        }
        if (!data.valid) {
            return;
        }

        if (data.type === 'RMC') handleSpeedData(data);
        if (data.type === 'GGA') handlePositionData(data);
    });

    //
    // Listen to the serial port and forward to the GPS.
    //
    port.on('data', function(data) {
        console.log('DEBUG GPS:', serialPort, data);
        try {
            gps.update(data);
        } catch (err) {
            console.error('GPS: There was an error: ', err);
        }
    });

    //
    // Handle valid GPS speed updates
    //
    function handleSpeedData(data) {
        self.speedData = {
            time: data.time.getTime(),  // convert to parsable time in milliseconds
            speed: convert_km_per_hour_to_meters_per_second(data.speed),  // convert from km/h to m/s
            direction: data.track       // Degrees
        };
        self.emit('speed', self.speedData);
    }

    //
    // Handle valid GPS position updates
    //
    function handlePositionData(data) {

        //
        // Set out position information
        //
        self.positionData = {
            time: data.time.getTime(), // convert to parsable time in milliseconds
            latitude: data.lat,
            longitude: data.lon,
            altitude: data.alt,         // Meters
            quality: data.quality,
            hdop: data.hdop,
        };
        self.emit('position', self.positionData);
        // console.log('DEBUG GPS:', serialPort, 'emitted "position": ', JSON.stringify(self.positionData));

    }

    EventEmitter.call(this);

}
util.inherits(GPS, EventEmitter);


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
