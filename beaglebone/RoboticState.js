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

var StateManager = require('sailboat-utils/StateManager');

var MODE_MANUAL = 'manual';
var MODE_ROBOTIC = 'robotic';

function RoboticState(logger) {
    var isRoboticState = new StateManager('isRobotic');
    var mode = MODE_MANUAL;

    isRoboticState.get(function(err, state) {
        if (state[0]) {
            mode = MODE_ROBOTIC;
        } else {
            mode = MODE_MANUAL;
        }
    });

    return {
        get isRobotic() {
            return mode === MODE_ROBOTIC;
        },
        get isManual() {
            return mode === MODE_MANUAL;
        },
        set: function(newMode) {
            if (mode === newMode) {
                logger.info('MODE: already in the given mode: ', newMode);
            } else if (newMode === MODE_ROBOTIC) {
                logger.info('MODE: Switching to robotic mode');
                isRoboticState.save([true]);
                mode = MODE_ROBOTIC;
            } else if (newMode === MODE_MANUAL) {
                logger.info('MODE: Switching to manual mode');
                isRoboticState.save([false]);
                mode = MODE_MANUAL;
            } else {
                logger.error('MODE: Invalid mode: ', newMode);
            }
        }
    };

}

module.exports = RoboticState;
