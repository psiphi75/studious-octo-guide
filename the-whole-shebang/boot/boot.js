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

/* Set this for octalbonescript such that it does load capes automatically */
if (typeof process.env.AUTO_LOAD_CAPE === 'undefined') {
    process.env.AUTO_LOAD_CAPE = 0;
}

var obs = require('octalbonescript');
console.log('\n\nLoaded octalbonescript');

// Load the universal cape
obs.loadCape('cape-universaln');
console.log('Loaded the universal cape');

// Enable serial for the GPS device
enableSerial('/dev/ttyO1');

// Enable serial for the GPRS Modem
enableSerial('/dev/ttyO2');

// This is required to initialise i2c-1 - currently used for the compass.
obs.i2c.open('/dev/i2c-1', 0x1e, function(data) {
        console.log(data);
    }, function(error, wire) {
        if (error) {
            console.error(error.message);
            return;
        }
        console.log(wire);
        console.log('Loaded i2c-1.');
    }
);

console.log('boot.js done');


function enableSerial(port) {
    obs.serial.enable(port, function(err) {
        if (err) {
            console.error(err);
            return;
        }
        console.log('enabled serial: ' + port);
    });
}
