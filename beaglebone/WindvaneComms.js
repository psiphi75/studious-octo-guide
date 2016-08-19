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

/*******************************************************************************
 *                                                                             *
 *                             Communication Code                              *
 *                                                                             *
 *         - Listen to status updates from windvane.                           *
 *                                                                             *
 *******************************************************************************/

var wrc = require('web-remote-control');

function WindvaneComms(wrcOptions, logger) {

    logger.info('WindvaneComms: Started');
    var self = this;

    this.listener = wrc.createController({
        proxyUrl: wrcOptions.proxyUrl,
        channel: 'windvane',
        udp4: wrcOptions.udp4,
        tcp: wrcOptions.tcp,
    });

    // Should wait until we are registered before doing anything else
    this.listener.on('register', function handleRegistered() {
        logger.info('WindvaneComms: Registered with proxy server:', wrcOptions.proxyUrl);
    });

    // Listens to commands from the controller
    this.listener.on('status', function (status) {
        logger.debug('WindvaneComms: got status update:', status);
        self.setStatus(status);
    });

    this.listener.on('error', logger.error);
    this.logger = logger;

    return {
        get status() {
            return self.status;
        },
        set status(status) {
            if (typeof status !== 'object') return;
            if (typeof status.heading === 'number' && typeof status.speed === 'number') {
                self.status.heading = status.heading;
                self.status.speed = status.speed;
                logger.debug('WindvaneComms: got status', status);
            } else {
                logger.error('WindvaneComms: invalid status: ', status);
            }
        }
    };
}


module.exports = WindvaneComms;
