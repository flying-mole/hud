var extend = require('extend');
var MockQuadcopter = require('./mock-quadcopter');
var Model = require('./model');
var config = require('../config');

var pidRanges = {
	x: {
		from: 0.001,
		to: 5,
		next: function (k) { return k * 1.1; }
	}
};
var pidType = 'stabilize';
var timeout = 60 * 1000; // 1min
var target = { x: 10, y: 0, z: 0 }; // Step

var results = [];

// Set quad config
config.debug = false;
config.controller.updater = 'stabilize-simple';

config.controller.pid[pidType].x[0] = pidRanges.x.from;
config.controller.pid[pidType].x[1] = 0;
config.controller.pid[pidType].x[2] = 0;

var model = new Model(config);
var quad = new MockQuadcopter(config, model);

quad.start().then(function () {
	function next() {
		console.log('Testing PID:', quad.config.controller.pid[pidType]);

		// Start the quad
		quad.ctrl.setTarget(target);
		quad.enabled = true;
		quad.power = 0.5;

		var overshoot = 0;
		var last = { x: 0, dx: 0 };
		var lastOvershoots = [0, 0];

		// Is value in 5% of target?
		var targetReachedBy = function (x) {
			return (Math.abs(x - target.x) / target.x < 0.05);
		};

		quad.on('stabilize', function () {
			var t = model.t;
			var x = quad.orientation.rotation.x;

			// Global overshoot
			if (x > overshoot) {
				overshoot = x;
			}

			// Last minor overshoots
			var dx = x - last.x;
			if (last.dx != 0 && dx * last.dx < 0) { // Just changed sign of dx
				if (last.dx > 0) { // dx < 0
					lastOvershoots[1] = x;
				} else {
					lastOvershoots[0] = x;
				}
			}
			last.x = x;
			last.dx = dx;

			var timeoutReached = (t > timeout);
			var targetReached = targetReachedBy(x);

			// Check that the are no overshoots outside 5%
			// TODO: not working
			if (targetReached && lastOvershoots[0]) {
				targetReached = targetReachedBy(lastOvershoots[0]);
			}
			if (targetReached && lastOvershoots[1]) {
				targetReached = targetReachedBy(lastOvershoots[1]);
			}

			if (timeoutReached || targetReached) {
				console.log('Finished:', (timeoutReached) ? 'timeout' : 'target', 't='+t, 'max='+overshoot, lastOvershoots);

				results.push({
					pid: extend(true, {}, config.controller.pid[pidType]),
					targetReached: targetReached,
					t: t,
					overshoot: overshoot,
					lastOvershoots: lastOvershoots
				});

				quad.enabled = false;
				model.reset();

				// Update PID params
				config.controller.pid[pidType].x[0] = pidRanges.x.next(config.controller.pid[pidType].x[0]);
				quad.config = config;

				if (config.controller.pid[pidType].x[0] > pidRanges.x.to) {
					console.log('Done!');
					process.exit();
				} else {
					next();
				}
				return;
			}
		});
	}

	next();

	// TODO: trigger a disruption on model
	// TODO: spy on orientation to see the result
}, function (err) {
	console.error('Cannot start quad.', err);
	process.exit(1);
});
