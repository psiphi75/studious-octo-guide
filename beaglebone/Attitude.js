/* eslint-disable no-use-before-define */
/** *******************************************************************
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

const AHRS = require('ahrs');
const Mpu9250 = require('mpu9250');
const util = require('sailboat-utils/util');
const geomagnetism = require('geomagnetism');

function Attitude(cfg) {
    this.sensorSampleIntervalSeconds = cfg.mpu9250.sampleInterval / 1000;
    this.magSampleInterval = cfg.mpu9250.sampleIntervalMagnetometer;
    this.lastMagReadTime = 0;
    this.attitude = {};

    //
    // Set the default declincation
    //
    this.setDeclination(cfg.location);

    //
    // Gyro/Compass/Accerometer unit
    //
    this.imu = new Mpu9250(cfg.mpu9250.options);
    this.imu.initialize();

    //
    // Make sense of the Gyro/Compass/Accerometer data
    //
    this.madgwick = new AHRS({
        sampleInterval: 1000 / cfg.mpu9250.sampleInterval, // Convert to Hz
        algorithm: 'Madgwick',
        beta: 0.8,
    });
}

/**
 * Required for the compass to determine true north (from the magnetic
 * declination).  The latitude / longitude values can be approximate.
 *
 * This should be called every time there is a significant update in the lat/long.
 *
 * @param  {object} latLongObj -  Object with 'latitude' and 'longitude' in degrees.
 */
Attitude.prototype.setDeclination = function(latLongObj) {
    let declinationDeg = 0;
    if (latLongObj.latitude && latLongObj.longitude) {
        const geo = geomagnetism.model().point([latLongObj.latitude, latLongObj.longitude]);
        declinationDeg = geo.decl;
    }
    this.declinationDegrees = declinationDeg;
};

Attitude.prototype.startCapture = function startCapture() {
    this.captureIntervalHandle = setInterval(this.capture.bind(this), this.sensorSamplePeriod);
};

Attitude.prototype.stopCapture = function stopCapture() {
    clearInterval(this.captureIntervalHandle);
};

/*
 * This will asyncronously retreive the sensor data (gyro, accel and compass).
 */
Attitude.prototype.capture = function capture() {
    // Don't capture the magnetometer every sample, only once every magSampleInterval.
    const startTime = new Date().getTime();
    const sensorDataArray = this.imu.getMotion9();
    const endTime = new Date().getTime();
    const sensorData = {
        timestamp: endTime,
        elapsedTime: endTime - startTime,
    };

    // Do transformations to get the sensors aligned with the the body.  Accel and gyro are on the same axis.
    // Magnetometer is (strangely) using a different axis.
    sensorData.accel = transformAccelGyro({
        x: sensorDataArray[0],
        y: sensorDataArray[1],
        z: sensorDataArray[2],
    });

    sensorData.gyro = transformAccelGyro({
        x: util.toRadians(sensorDataArray[3]),
        y: util.toRadians(sensorDataArray[4]),
        z: util.toRadians(sensorDataArray[5]),
    });

    // Only read mag data if it's available
    if (sensorDataArray.length > 6) {
        sensorData.compass = transformMag({
            x: sensorDataArray[6],
            y: sensorDataArray[7],
            z: sensorDataArray[8],
        });
    } else {
        sensorData.compass = {
            x: 0,
            y: 0,
            z: 0,
        };
    }

    this.madgwick.update(
        sensorData.gyro.x,
        sensorData.gyro.y,
        sensorData.gyro.z,
        sensorData.accel.x,
        sensorData.accel.y,
        sensorData.accel.z,
        sensorData.compass.x,
        sensorData.compass.y,
        sensorData.compass.z,
        this.sensorSampleIntervalSeconds
    );
};

Attitude.prototype.getAttitude = function getAttitude() {
    //
    // Add heading, pitch and roll
    //
    const hpr = this.madgwick.getEulerAngles();

    // NOTE: Here we change the heading to a negative value, this goes against normal mathematical convention.
    //       But this aligns geospatial headings, (e.g. a typical compass).
    const heading = util.wrapDegrees(-util.toDegrees(hpr.heading) + this.declinationDegrees);

    hpr.heading = heading;
    hpr.pitch = util.toDegrees(hpr.pitch);
    hpr.roll = util.toDegrees(hpr.roll);

    return hpr;
};

/**
 * Transformation:
 *  - Rotate around Z axis 180 degrees
 *  - Rotate around X axis -90 degrees
 *
 * @param  {object} s - {x,y,z} sensor
 * @returns {object}   {x,y,z} transformed
 */
function transformAccelGyro(s) {
    return {
        x: -s.y,
        y: -s.z,
        z: s.x,
    };
}

/**
 * Transformation: to get magnetometer aligned
 *
 * @param  {object} s - {x,y,z} sensor
 * @returns {object}   {x,y,z} transformed
 */
function transformMag(s) {
    return {
        x: -s.x,
        y: s.z,
        z: s.y,
    };
}

module.exports = Attitude;
