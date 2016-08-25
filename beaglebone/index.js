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
 *          Configuration settings - need to be customised to requirements     *
 *                                                                             *
 *******************************************************************************/

var cfg = require('config');
var logger = require('./logger');


/*
 * Output config settings - we will pick these up later.
 */
var header = cfg.util.cloneDeep(cfg);
header.timestamp = new Date().getTime();
logger.info('Starting the-whole-shebang:');
logger.info('--- CONFIG START ---');
logger.info('HEADER:' + JSON.stringify(header));
logger.info('--- CONFIG END ---');


var MODE_MANUAL = 'manual';
var MODE_AUTO = 'robotic';
var mode = MODE_MANUAL;


/*******************************************************************************
 *                                                                             *
 *                           Load necessary libraries                          *
 *                                                                             *
 *******************************************************************************/

/* Set this for octalbonescript such that it does load capes automatically */
process.env.AUTO_LOAD_CAPE = 0;
var obs = require('octalbonescript');
var boatUtil = require('sailboat-utils/boatUtil');
var util = require('sailboat-utils/util');

var GPSSync = require('./GPSSync');
var gps = new GPSSync(cfg);

var Attitude = require('./Attitude');
var attitude = new Attitude(cfg);
attitude.setDeclination(cfg.location);
attitude.startCapture();

var Velocity = require('./Velocity');
var velocity = new Velocity();

/*******************************************************************************
 *                                                                             *
 *                              Awaken our robot                               *
 *                                                                             *
 *******************************************************************************/

var Psiphi75 = require('sailboat-ai-psiphi75');
var robot = new Psiphi75();
robot.init({
    'type': 'fleet-race',
    'waypoints': [{
                    'latitude': -36.80959066043442,
                    'longitude': 174.75014324799585,
                    'achieved': false,
                    'type': 'circle',
                    'radius': 2
                }, {
                    'latitude': -36.80957516109161,
                    'longitude': 174.75038367510066,
                    'achieved': false,
                    'type': 'circle',
                    'radius': 2
                }, {
                    'latitude': -36.80941416766029,
                    'longitude': 174.75067288150413,
                    'achieved': false,
                    'type': 'circle',
                    'radius': 2
                }, {
                    'latitude': -36.80927504428124,
                    'longitude': 174.750659676397,
                    'achieved': false,
                    'type': 'circle',
                    'radius': 2
            }],
    'boundary': [{ 'latitude': -36.80957695, 'longitude': 174.75005930},
                 { 'latitude': -36.80972644, 'longitude': 174.75022131},
                 { 'latitude': -36.80947036, 'longitude': 174.75079291},
                 { 'latitude': -36.80908740, 'longitude': 174.75076607},
                 { 'latitude': -36.80910334, 'longitude': 174.75055488},
                 { 'latitude': -36.80935610, 'longitude': 174.75043135}],
    'timeLimit': 300,
    'timeToStart': -300000
});

/*******************************************************************************
 *                                                                             *
 *                           Sensor collection code                            *
 *                                                                             *
 *******************************************************************************/

//
// Sends data to the controller
//
function sendData() {
    var state = getState();
    manualControl.status(state); // We always send the updated state
    if (mode === MODE_AUTO) {
        var command = robot.ai(state);
        if (command.action === 'move') {
            actionMove(command, MODE_AUTO);
        }
    }
    logger.info('STATUS:' + JSON.stringify(state));
}
// Collect the data into a nice object ready for sending
var isFirstGPS = true;
function getState() {

    var gpsPosition = gps.getPosition();
    if (isFirstGPS && util.isValidGPS(gpsPosition)) {
        attitude.setDeclination(gpsPosition);
        isFirstGPS = false;
    }

    var attitudeValues = attitude.getAttitude();

    var wind;
    if (windvane) {
        wind = windvane.getStatus();
    }

    var boatVelocity = velocity.calcFromPosition(gpsPosition);
    if (!boatVelocity || boatVelocity.speed === 0) {
        boatVelocity = {
            speed: 0,
            heading: attitudeValues.heading
        };
    }

    var apparentWind;
    var trueWind;
    if (wind) {
        apparentWind = boatUtil.calcApparentWind(wind.speed, wind.heading, boatVelocity.speed, attitudeValues.heading);
        trueWind = boatUtil.calcTrueWind(wind.speed, wind.heading, boatVelocity.speed, attitudeValues.heading);
    }

    return {
           dt: cfg.webRemoteControl.updateInterval,
           isRobotic: (mode === MODE_AUTO),
           boat: {
                attitude: attitudeValues,
                gps: gpsPosition,
                velocity: boatVelocity,
                trueWind: trueWind,
                apparentWind: apparentWind,
                servos: {
                    sail: servoSail.getLastValue(),
                    rudder: servoRudder.getLastValue()
                }
          },
          environment: {
               wind: wind
          }
    };

}


/*******************************************************************************
 *                                                                             *
 *                             Communication Code                              *
 *                                                                             *
 *         - Listen to commands from the controller.                           *
 *         - Send status updates (sensor data) to the controller / listeners   *
 *                                                                             *
 *******************************************************************************/

// Set up the two servos.
var Servo = require('./Servo');
var servoSail = new Servo('Sail', obs, cfg.servos.sail, function () {});
var servoRudder = new Servo('Rudder', obs, cfg.servos.rudder, function () {});

var wrc = require('web-remote-control');
var wrcOptions = { proxyUrl: cfg.webRemoteControl.url,
                   channel: cfg.webRemoteControl.channel,
                   udp4: true,
                   tcp: false,
                   log: logger.debug };

logger.debug(wrcOptions);
var windvane;
if (cfg.webRemoteControl.useNetworkDiscovery) {
    var DISCOVERY_PROXY_NAME = 'web-remote-control-proxy';
    var polo = require('polo');
    var apps = polo();
    apps.put({
        name: 'sailboat',
        port: 31234
    });

    apps.on('up', function (name) {
        if (name === DISCOVERY_PROXY_NAME) {
            wrcOptions.proxyUrl = apps.get(name).host;
            initToyToProxyCommunication();
            var WindvaneComms = require('./WindvaneComms');
            windvane = new WindvaneComms(wrcOptions, logger);
        }
    });

    apps.on('error', function (err) {
        logger.error('POLO: ' + err);
    });

} else {
    initToyToProxyCommunication();
}

var manualControl = { status: function() {} };  // dummy function for now... until registered
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

    manualControl.on('error', function(err) {
        logger.error(err);
    });
}

function handleManualCommand(command) {

    switch (command.action) {
        case 'note':
            logger.info('NOTE:' + JSON.stringify(command.note));
            if (command.note === 'Shutdown') {
                require('child_process').exec('/sbin/shutdown --poweroff now', function (msg) {
                    logger.info('Shutting down: ' + msg);
                });
            }
            break;
        case 'move':
            actionMove(command, MODE_MANUAL);
            break;
        case 'mode':
            actionChangeMode(command);
            break;
        default:
            logger.error('ERROR - invalid command: ' + JSON.stringify(command));
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

// This function gets called when we receive a 'command' from the controller.
// It will move the servos respectively.
function actionMove(command, targetMode) {

    if (mode === targetMode) {
        servoSail.set(command.servoSail);
        servoRudder.set(command.servoRudder);
    }

}

function actionChangeMode(command) {
    var newMode = command.mode;
    if (mode === newMode) {
        logger.info('MODE: already in the given mode: ', newMode);
    } else if (newMode === MODE_AUTO) {
        logger.info('MODE: Switching to robotic mode');
        switchToRoboticMode();
    } else {
        logger.info('MODE: Switching to manual mode');
        switchToManualMode();
    }
}

function switchToRoboticMode() {
    mode = MODE_AUTO;
}
function switchToManualMode() {
    mode = MODE_MANUAL;
}

/********************************************************************************************
 *
 *                                      Let the show begin!
 *
 ********************************************************************************************/

setInterval(sendData, cfg.webRemoteControl.updateInterval);
