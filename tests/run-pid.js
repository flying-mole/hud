var fs = require('fs');
var extend = require('extend');
var MockQuadcopter = require('./mock-quadcopter');
var Model = require('./model');
var config = require('../config');

var pids = {
	rate: [0.02, 0, 0],
	stabilize: [2, 0.1, 0]
};
var timeout = 15 * 1000; // in ms
var target = { x: 10, y: 0, z: 0 }; // Step

// Set quad config
config.debug = false;
config.controller.updater = 'stabilize-simple';
config.controller.pid.stabilize.x = pids.stabilize;
config.controller.pid.rate.x = pids.rate;

var startTime = Date.now();

var model = new Model(config);
var quad = new MockQuadcopter(config, model);

var output = [];

quad.start().then(function () {
	quad.on('stabilize', function () {
		if (!quad.enabled) return;

		var t = model.t;
		var orientation = quad.orientation;
		var x = orientation.rotation.x;

		//console.log(quad.motorsSpeed, quad.motorsForces, quad.orientation.rotation);

		output.push({
			t: t,
			x: x
		});

		if (t > timeout) {
			console.log('Done after '+(Date.now() - startTime)+'ms');

			quad.enabled = false;
			quad.stop();

			var csv = 't,x\n';
			output.forEach(function (item) {
				csv += item.t+','+item.x+'\n';
			});

			console.log('Writing file...', csv.length, 'bytes');
			fs.writeFile('output.csv', csv, function (err) {
				if (err) console.log(err);

				console.log('Finished.');

				process.exit();
			});
			return;
		}
	});

	// Start the quad
	quad.ctrl.setTarget(target);
	quad.enabled = true;
	quad.power = 0.5;
}, function (err) {
	console.error('Cannot start quad.', err);
	process.exit(1);
});
