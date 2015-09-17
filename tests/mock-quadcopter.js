'use strict';

var Quadcopter = require('../lib/quadcopter');

class MockQuadcopter extends Quadcopter {
	constructor(config, model) {
		super(config);

		this.model = model;
	}

	_readOrientation(done) {
		done(null, this.model.orientation);
	}

	_setMotorsSpeeds(speeds) {
		this.model.motorsSpeed = speeds;
	}

	_stabilizeLoop() {
		var that = this;

		if (!this._started) return;

		var startTime = Date.now();
		this._stabilize(function (err) {
			if (err) console.error(err);

			// Update model time variable
			that.model.t += (Date.now() - startTime) + that.config.pid.interval;

			process.nextTick(function () {
				that._stabilizeLoop();
			});
		});
	}
}

module.exports = MockQuadcopter;
