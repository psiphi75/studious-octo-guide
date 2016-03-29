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

module.exports = {

    /**
     * Round a number to dp number of decimal points.
     * @param  {number} val The number to round
     * @param  {number} dp  decimal points (whole number)
     * @return {number}     The rounded number
     */
    round: function (val, dp) {
        if (typeof val !== 'number') {
            return val;
        }
        var pow = Math.pow(10, dp);
        return Math.round(val * pow) / pow;
    },

    /**
     * Round {x,y,z} vector values to the dp number of decimal points.
     * @param  {object} v  The object with x,y,z as numbers.
     * @param  {number} dp decimal points (whole number).
     * @return {object}    The rounded x,y,z vector.
     */
    roundVector: function (v, dp) {
        if (typeof v !== 'object') {
            console.error('roundVector(): supplied parameter is not an object', v);
        }
        validateVectorValue('x');
        validateVectorValue('y');
        validateVectorValue('z');

        return {
            x: this.round(v.x, dp),
            y: this.round(v.y, dp),
            z: this.round(v.z, dp)
        };

        function validateVectorValue(dim) {
            if (typeof v[dim] !== 'number') {
                console.error('roundVector(): supplied parameter is not a valid vector.  The ' + dim + ' dimension is invalid.');
            }
        }
    },

    /**
     * Vector to String
     * @param  {object} v The x,y,z vector as an object
     * @return {String}   Numbers as strings separated by tabs.
     */
    vToStr: function (v) {
        if (v && typeof v.x === 'number') {
            return v.x.toString() + '\t' + v.y.toString() + '\t' + v.z.toString();
        } else {
            return v;
        }
    },

    /**
     * Convert a latitude and longitude values to strings
     * @param  {object} v Vector with latitude and longitude.
     * @return {string}   String of latitude and longitude, separated by a tab.
     */
    gpsToStr: function (v) {
        if (v && typeof v.latitude === 'number') {
            return this.round(v.latitude, 5).toString() + '\t' + this.round(v.longitude, 5).toString();
        } else {
            return v;
        }
    }

};
