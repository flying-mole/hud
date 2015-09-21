var fs = require('fs');
var extend = require('extend');
var MockQuadcopter = require('./mock-quadcopter');
var Model = require('./model');
var config = require('../config');

var pidRanges = [
	{
		from: 1,// 0.1,
		to: 20,
		next: function (k) { return k * 1.2; }
		//next: function (k) { return k + 0.1; }
	},
	{
		from: 0.01,
		to: 0.1,
		next: function (k) { return k * 1.2; }
		//next: function (k) { return k + 0.01; }
	},
	{
		from: 0.01,
		to: 0.1,
		next: function (k) { return k * 1.2; }
	}
];
var pidType = 'stabilize';
var timeout = 30 * 1000; // in ms
var target = { x: 10, y: 0, z: 0 }; // Step

var results = [];

// Set quad config
config.debug = false;
config.controller.updater = 'stabilize-simple';

function resetPidValue(i) {
	config.controller.pid[pidType].x[i] = pidRanges[i].from;
}

function nextPidValue(i) {
	if (config.controller.pid[pidType].x[i] > pidRanges[i].to) {
		return false;
	}

	config.controller.pid[pidType].x[i] = pidRanges[i].next(config.controller.pid[pidType].x[i]);
	return true;
}

resetPidValue(0); // K_p
resetPidValue(1); // K_i
resetPidValue(2); // K_d

var model = new Model(config);
var quad = new MockQuadcopter(config, model);

quad.start().then(function () {
	var output = [];

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
			// Is value in 5% of target?
			function targetReached(x) {
				return (Math.abs(x - target.x) / target.x < 0.05);
			}

			var respTime = 0;
			for (var i = output.length - 1; i >= 0; i--) {
				var item = output[i];

				if (!targetReached(item.x)) {
					respTime = item.t;
					break;
				}
			}
			output = [];

			//console.log('Finished:', 'respTime='+respTime);

			results.push({
				pid: extend(true, [], config.controller.pid[pidType].x),
				responseTime: respTime
			});

			quad.enabled = false;
			model.reset();

			// Update PID values
			if (!nextPidValue(0)) {
				resetPidValue(0);

				console.log('Testing:', config.controller.pid[pidType].x);

				if (!nextPidValue(1)) {
					resetPidValue(1);

					if (!nextPidValue(2)) {
						quad.stop();

						console.log('Done!');

						var csv = 'k_p,k_i,k_d,responseTime\n';
						results.forEach(function (item) {
							csv += item.pid.join(',')+','+item.responseTime+'\n';
						});
						console.log('Writing file...', csv.length, 'bytes');
						fs.writeFile('output.csv', csv, function (err) {
							if (err) console.log(err);
							
							console.log(results.sort(function (a, b) {
								return a.responseTime - b.responseTime;
							}).splice(0, 20));

							process.exit();
						});
						return;
					}
				}
			}

			quad.config = config;
			next();
		}
	});

	function next() {
		//console.log('Testing PID:', quad.config.controller.pid[pidType].x);

		// Start the quad
		quad.ctrl.setTarget(target);
		quad.enabled = true;
		quad.power = 0.5;
	}

	next();

	// TODO: trigger a disruption on model
	// TODO: spy on orientation to see the result
}, function (err) {
	console.error('Cannot start quad.', err);
	process.exit(1);
});
