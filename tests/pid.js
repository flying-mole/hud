var MockQuadcopter = require('./mock-quadcopter');
var Model = require('./model');
var config = require('../config');

config.debug = false;
config.controller.updater = 'stabilize-simple';

var pidRanges = {
	x: {
		from: 0.001,
		to: 5,
		next: function (k) { return k * 1.1; }
	}
};
var pidType = 'stabilize';

config.controller.pid[pidType].x[0] = pidRanges.x.from;
config.controller.pid[pidType].x[1] = 0;
config.controller.pid[pidType].x[2] = 0;

var model = new Model(config);
var quad = new MockQuadcopter(config, model);

quad.start().then(function () {
	function next() {
		console.log('Testing PID:', quad.config.controller.pid[pidType]);

		// Start the quad
		quad.enabled = true;
		quad.power = 0.5;

		quad.on('stabilize', function () {
			var t = model.t;

			if (t > 60 * 1000) {
				console.log('Finished.');

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
