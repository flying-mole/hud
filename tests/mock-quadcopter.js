'use strict';

var Quadcopter = require('../lib/quadcopter');

class MockQuadcopter extends Quadcopter {
	constructor(config, model) {
		super(config);

		this.model = model;
	}

	_readOrientation(done) {
		done(this.model.orientation);
	}

	_setMotorsSpeeds(speeds) {
		this.model.motorsSpeed = speeds;
	}
}

module.exports = MockQuadcopter;
