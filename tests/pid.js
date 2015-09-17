var MockQuadcopter = require('./mock-quadcopter');
var Model = require('./model');
var config = require('../config');

// TODO: set PID constants to be tested

var model = new Model(config);
var quad = new MockQuadcopter(config, model);

quad.start().then(function () {
	quad.enabled = true;
	quad.power = 0.5;

	// TODO: trigger a disruption on model
	// TODO: spy on orientation to see the result
}, function (err) {
	console.error('Cannot start quad.', err);
});
