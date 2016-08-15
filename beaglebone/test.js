'use strict';

var GPS = require('./GPS');
var Velocity = require('./Velocity');
var vel = new Velocity();

var dev = process.env.DEV;
var gps = new GPS(dev, 9600);

gps.on('position', calcVel);

function calcVel(pos) {
    var v = vel.calcFromPosition(pos);
    console.log(dev, v.speed.toFixed(2), pos.sameCounter, pos.latitude.toFixed(6), pos.longitude.toFixed(6), pos.hdop, pos.quality);
}
