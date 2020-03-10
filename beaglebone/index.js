/* eslint-disable no-use-before-define */
/* eslint-disable no-console */
/** ******************************************************************
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

/** ****************************************************************************
 *                                                                             *
 *          Configuration settings - need to be customised to requirements     *
 *                                                                             *
 ****************************************************************************** */

const cfg = require('config');
const util = require('sailboat-utils/util');
const wrc = require('web-remote-control');
const Psiphi75 = require('sailboat-ai-psiphi75');
const logger = require('./logger');

/*
 * Output config settings - we will pick these up later.
 */
const header = cfg.util.cloneDeep(cfg);
header.timestamp = new Date().getTime();
logger.info('Starting the-whole-shebang:');
logger.info('--- CONFIG START ---');
logger.info(`HEADER:${JSON.stringify(header)}`);
logger.info('--- CONFIG END ---');

/** *****************************************************************************.
 *                                                                             *
 *                           Load necessary libraries                          *
 *                                                                             *
 ****************************************************************************** */

/* Set this for bonescript such that it does load capes automatically */

const GPSSync = require('./GPSSync');

const gps = new GPSSync(cfg);

const Attitude = require('./Attitude');

const attitude = new Attitude(cfg);
attitude.setDeclination(cfg.location);
attitude.startCapture();

const RoboticState = require('./RoboticState');

const controlMode = RoboticState(logger);

// Set up the two servos.
const Servo = require('./Servo');

const servoSail = new Servo('Sail', cfg.servos.sail);
const servoRudder = new Servo('Rudder', cfg.servos.rudder);

/** *****************************************************************************.
 *                                                                             *
 *                              Awaken our robot                               *
 *                      (after checking out the course)                        *
 *                                                                             *
 ****************************************************************************** */

let robot;

const contestManager = wrc.createController({
    proxyUrl: 'localhost',
    channel: 'ContestManager',
    udp4: false,
    tcp: true,
});

contestManager.once('register', () => {
    //
    // Once registered send the request for a contest
    //
    const msgObj = cfg.contest;
    msgObj.action = 'request-contest';
    contestManager.command(msgObj);
});

contestManager.on('status', msgObj => {
    robot = Psiphi75();
    msgObj.contest.saveState = wpState => {
        contestManager.command({
            action: 'update-waypoint-state',
            state: wpState,
        });
    };
    robot.init(msgObj.contest);
});

/** *****************************************************************************.
 *                                                                             *
 *                           Sensor collection code                            *
 *                                                                             *
 ****************************************************************************** */

// Collect the data into a nice object ready for sending
let isFirstGPS = true;

// dummy function for now... until registered
let manualControl = {
    status(_) {
        return _;
    },
};

function getState() {
    const gpsPosition = gps.getPosition();
    if (util.isValidGPS(gpsPosition)) {
        logger.wrscLog(util.wrscGPSlogger(gpsPosition));
        if (isFirstGPS) {
            attitude.setDeclination(gpsPosition);
            isFirstGPS = false;
        }
    }

    const attitudeValues = attitude.getAttitude();

    let wind;
    if (windvane) {
        // wind = windvane.getStatus();
        wind = {
            speed: 4,
            heading: -54,
        };
    }

    return {
        dt: cfg.webRemoteControl.updateInterval,
        isRobotic: controlMode.isRobotic,
        boat: {
            attitude: attitudeValues,
            gps: gpsPosition,
            // apparentWind: wind, // FIXME: Apparent wind should be different
            servos: {
                sail: servoSail.getLastValue(),
                rudder: servoRudder.getLastValue(),
            },
        },
        environment: {
            wind,
        },
    };
}

//
// Sends data to the controller
//
function sendData() {
    const state = getState();
    let command;
    manualControl.status(state); // We always send the updated state
    if (controlMode.isRobotic && robot) {
        try {
            command = robot.ai(state);
        } catch (ex) {
            console.error('ERROR: Running AI: ', ex);
        }
        if (command && command.action === 'move') {
            actionMove(command);
        }
    }
    logger.info(`STATUS:${JSON.stringify(state)}`);
}

/* ****************************************************************************
 *                                                                             *
 *                             Communication Code                              *
 *                                                                             *
 *         - Listen to commands from the controller.                           *
 *         - Send status updates (sensor data) to the controller / listeners   *
 *                                                                             *
 ****************************************************************************** */

const wrcOptions = {
    proxyUrl: cfg.webRemoteControl.url,
    channel: cfg.webRemoteControl.channel,
    udp4: false,
    tcp: true,
    log: logger.debug,
};

logger.debug(wrcOptions);
let windvane;

function actionOnNote(command) {
    logger.info(`NOTE:${JSON.stringify(command.note)}`);
    switch (command.note) {
        case 'Shutdown':
            require('child_process').exec('/sbin/shutdown --poweroff now', msg => {
                logger.info(`Shutting down: ${msg}`);
            });
            break;
        case 'Reboot':
            require('child_process').exec('/sbin/shutdown --reboot now', msg => {
                logger.info(`Rebooting: ${msg}`);
            });
            break;
        case 'RestartProcess':
            throw new Error('User requested "RestartProcess"');
        case 'ResetCourse':
            contestManager.command({
                action: 'reset-waypoint-state',
            });
            break;
        default:
    }
}

function handlePing(time) {
    if (time > 0) {
        logger.info('COMMS:Ping time to proxy (ms):', time);
    }
}

function handleRegistered() {
    logger.info('COMMS:Registered with proxy server:', cfg.webRemoteControl.url);
}

function handleManualCommand(command) {
    if (!command) {
        logger.error(`ERROR - invalid command: ${JSON.stringify(command)}`);
        return;
    }

    switch (command.action) {
        case 'note':
            actionOnNote(command);
            break;
        case 'move':
            if (controlMode.isManual) {
                actionMove(command);
            }
            break;
        case 'mode':
            controlMode.set(command.mode);
            break;
        default:
            logger.error(`ERROR - invalid command action: ${JSON.stringify(command)}`);
    }
}

function initToyToProxyCommunication() {
    // Don't initialise twice
    if (manualControl && manualControl.ping) return;

    manualControl = wrc.createToy(wrcOptions);

    // Should wait until we are registered before doing anything else
    manualControl.on('register', handleRegistered);

    // Ping the proxy and get the response time (in milliseconds)
    manualControl.ping(handlePing);

    // Listens to commands from the controller
    manualControl.on('command', handleManualCommand);

    manualControl.on('error', err => {
        logger.error(err);
    });
}

// This function gets called when we receive a 'command' from the controller.
// It will move the servos respectively.
function actionMove(command) {
    servoSail.setValue(command.servoSail);
    servoRudder.setValue(command.servoRudder);
}

if (cfg.webRemoteControl.useNetworkDiscovery) {
    const DISCOVERY_PROXY_NAME = 'web-remote-control-proxy';
    const polo = require('polo');
    const apps = polo();
    apps.put({
        name: 'sailboat',
        port: 31234,
    });

    apps.on('up', name => {
        if (name === DISCOVERY_PROXY_NAME) {
            wrcOptions.proxyUrl = apps.get(name).host;
            initToyToProxyCommunication();
            const WindvaneComms = require('./WindvaneComms');
            windvane = new WindvaneComms(wrcOptions, logger);
        }
    });

    apps.on('error', err => {
        logger.error(`POLO: ${err}`);
    });
} else {
    initToyToProxyCommunication();
}

/** ******************************************************************************************.
 *
 *                                      Let the show begin!
 *
 ******************************************************************************************* */

setInterval(sendData, cfg.webRemoteControl.updateInterval);
