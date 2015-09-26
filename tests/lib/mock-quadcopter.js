'use strict';

var QuadcopterBase = require('../../lib/quadcopter-base');

class MockQuadcopter extends QuadcopterBase {
	constructor(config, model) {
		super(config);

		this.model = model;
	}

	_readOrientation(done) {
		done(null, this.model.orientation);
	}

	_setMotorsSpeeds(speeds) {
		this._motorsSpeed = speeds;
		this.model.motorsSpeed = speeds;
	}

	_stabilizeLoop() {
		var that = this;

		if (!this._started) return;

		this._stabilize(function (err) {
			if (err) console.error(err);

			// Update model variables
			that.model.t += that.config.controller.interval;
			if (that.motorsForces) {
				that.model.motorsForces = that.motorsForces;
			}

			that.emit('stabilize');

			if (that.enabled) {
				process.nextTick(function () {
					that._stabilizeLoop();
				});
			} else {
				setTimeout(function () {
					that._stabilizeLoop();
				}, 200);
			}
		});
	}
}

module.exports = MockQuadcopter;
