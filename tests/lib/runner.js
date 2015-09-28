'use strict';

var MockQuadcopter = require('./mock-quadcopter');
var Model = require('./model');
var config = require('../../config');

config.debug = false;

/**
 * This function will return a test runner.
 */
module.exports = function () {
	var model = new Model(config);
	var quad = new MockQuadcopter(config, model);

	/**
	 * Run a test. Options:
	 * * `timeout`: the test won't last forever: a timeout is needed to know when to give up
	 * * `target`: the target angle
	 * * `updater`: which updater to use to stabilize the quad
	 * * `updaterConfig`: the updater's config
	 * 
	 * @param  {Object} options
	 * @return {Promise}
	 */
	return function run(options) {
		if (!options.timeout) {
			return Promise.reject('No timeout specified in options');
		}

		if (quad.enabled) {
			return Promise.reject('Another test is already running');
		}

		// Set quad config
		config.controller.updater = options.updater;
		config.updaters[options.updater] = options.pid || options.updaterConfig;
		quad.config = config;

		quad.ctrl.setTarget({ x: options.target, y: 0, z: 0 });

		var output = { t: [], x: [] };

		return quad.start().then(function () {
			return new Promise(function (resolve, reject) {
				quad.on('stabilize', function () {
					if (!quad.enabled) return;

					var t = model.t;
					var orientation = quad.orientation;
					var x = orientation.rotation.x;

					//console.log(quad.motorsSpeed, quad.motorsForces, quad.orientation.rotation);

					output.t.push(t);
					output.x.push(x);

					if (t > options.timeout || Math.abs(x) > 360) {
						quad.enabled = false;
						quad.stop();
						quad.removeAllListeners('stabilize');
						model.reset();

						resolve(output);
					}
				});

				// Start the quad
				quad.enabled = true;
				quad.power = 0.5;
			});
		});
	};
};
