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
 * This script will configure the GPS devices.  It will:
 *  - detect the baudrate
 *  - set the baudrate to 115200 (default is 9600)
 *  - set the NMEA output to only GGA and RMC sentences
 *  - set the NMEA rate to 10 Hz (default is 1 Hz)
 */

console.log('Running initGPS.js');

var cfg = require('config');
var configGPS = require('./ConfigGPS');


configGPS(cfg.gps['1'].serialport, cfg.gps['1'].baudrate, cfg.gps['1'].updateRate, function() {
    configGPS(cfg.gps['2'].serialport, cfg.gps['2'].baudrate, cfg.gps['2'].updateRate, function () {
        console.log('************************************************************');
        console.log('*                                                          *');
        console.log('*               DONE: All GPS Initialisation               *');
        console.log('*                                                          *');
        console.log('************************************************************');
    });
});
