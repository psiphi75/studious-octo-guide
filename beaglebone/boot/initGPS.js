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
 * This script will configure the GPS device.  It will:
 *  - detect the baudrate
 *  - set the baudrate to 115200 (default is 9600)
 *  - set the NMEA output to only GGA and RMC sentences
 *  - set the NMEA rate to 10 Hz (default is 1 Hz)
 */

console.log('Running initGPS.js');

var PMTK = require('pmtk');
var cfg = require('config');

var pmtk = new PMTK(cfg.gps.serialport, 'detect', stdCallbackFactory('Initialise and autodetect speed', setBaudrate));

function setBaudrate() {
    console.log('\nSetting baudrate (' + cfg.gps.baudrate + '):');
    pmtk.commands.setBaudrate(cfg.gps.baudrate, function (err) {
        if (err === 'timeout') {
            console.log('Change baudrate successful: ', cfg.gps.baudrate);
            newPMTK();
        } else if (err) {
            console.log('ERROR setting baudrate: ', err);
        }
    });
}

function newPMTK() {
    pmtk = new PMTK(cfg.gps.serialport, cfg.gps.baudrate, stdCallbackFactory('Initialise fresh PMTK @' + cfg.gps.baudrate + ' baud', setNmeaOutput));
}

function setNmeaOutput() {
    pmtk.commands.setNmeaOutput(['GGA', 'RMC'], stdCallbackFactory('Change NMEA output', setUpdateRate));
}

function setUpdateRate() {
    var gpsFreq = 1000 / cfg.gps.updateRate;
    pmtk.commands.setNmeaOutputRate(gpsFreq, stdCallbackFactory('Change to ' + cfg.gps.updateRate + ' Hz', function() {}));
}

function stdCallbackFactory(name, nextFn) {
    console.log('\nStarting ' + name + ':');
    return function (err, result) {
        if (err) {
            console.log('ERROR: ', name + ': ', err);
        } else {
            console.log(name + ' successful: ', result);
        }
        nextFn();
    };
}
