/** *******************************************************************.
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
 ******************************************************************** */

'use strict';

const winston = require('winston');

const logger = new winston.Logger({
    transports: [
        new winston.transports.Console({
            timestamp: function() {
                return Date.now();
            },
            formatter(options) {
                // Return string will be passed to logger.
                let result = '';
                result += `${options.timestamp()} `;
                result += `${options.level.toUpperCase()} `;
                if (undefined !== options.message) {
                    result += options.message;
                }
                if (options.meta && Object.keys(options.meta).length) {
                    result += `\t${JSON.stringify(options.meta)}`;
                }
                return result;
            },
        }),
    ],
});

const fs = require('fs');

logger.wrscLog = function wrscLog(wrscStr) {
    fs.appendFile('/home/debian/logs/wrsc.log', `${wrscStr}\n`, err => {
        if (err) {
            logger.error('logger.wrscLog()', err);
        }
    });
};

if (process.env.DEBUG) {
    logger.level = 'debug';
}

module.exports = logger;
