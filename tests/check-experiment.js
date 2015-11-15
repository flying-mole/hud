'use strict';

var Model = require('./lib/model');
var config = require('../config');

var tMax = 10 * 1000; // 2 seconds
var tInterval = 100; // 100ms

var model = new Model(config);

var dfList = [
	0.1286028384,
	0.2572056768,
	0.321507096,
	0.482260644,
	0.6108634824,
	0.8037677401,
	0.8680691593,
	1.0931241265,
	1.2217269649,
	1.4467819321
];

var results = [];

dfList.forEach(function (df) {
	model.reset();
	model.motorsForces = [0.85 + df, 1, 0.85, 1]; // In Newtons

	var orientation;
	for (var t = 0; t <= tMax; t += tInterval) {
		model.t = t;
		orientation = model.orientation;
	}

	// Facteur correctif expérimental
	//console.log(orientation.rotation.x * 1.2307692519);
	console.log(orientation.rotation.x);
});
