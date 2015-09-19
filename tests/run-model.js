'use strict';

var Model = require('./model');
var config = require('../config');

var tMax = 2 * 1000; // 2 seconds
var tInterval = 100; // 100ms

var model = new Model(config);
model.motorsForces = [1.1, 1, 0.9, 1]; // In Newtons

for (var t = 0; t <= tMax; t += tInterval) {
	model.t = t;

	var orientation = model.orientation;

	console.log(t, orientation);
}
