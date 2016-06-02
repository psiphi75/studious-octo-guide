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
 * This script will be loaded at boot time.  Octalbonescript will load capes that
 * are required and enable the serial ports that we need.
 *
 * For BBG booting see: http://mybeagleboneblackfindings.blogspot.com/2013/10/running-script-on-beaglebone-black-boot.html
 *
 */

var config = require('config');

var GPS_SERIAL = config.get('sensors.gps.serialport');
var MODEM_SERIAL = config.get('modem.serialport');

/* Set this for octalbonescript such that it does load capes automatically */
process.env.AUTO_LOAD_CAPE = 0;
var obs = require('octalbonescript');
console.log('\n\nLoaded octalbonescript');

// Load the universal cape
obs.loadCape('cape-universaln');
console.log('Loaded the universal cape');

// Enable serial for the GPS device
enableSerial(GPS_SERIAL);

// Enable serial for the GPRS Modem
enableSerial(MODEM_SERIAL);

// This is required to initialise i2c-1 - currently used for the compass.
enableI2c('/dev/i2c-1', 0x1e);

function enableI2c(i2cBus, i2cAddress) {
    obs.i2c.open(i2cBus, i2cAddress, function() {}, getStandardCB('Enabled i2c: ' + i2cBus));
}

function enableSerial(port) {
    obs.serial.enable(port, getStandardCB('Enabled serial port: ' + port));
}

/**
 * Return a standard callback.
 * @param  {string} successMsg The message to print on successMsg
 */
function getStandardCB(successMsg) {
    return function(err) {
        if (err) {
            console.error(err);
            return;
        } else {
            console.log(successMsg);
        }
    };
}
