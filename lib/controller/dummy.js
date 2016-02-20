'use strict';

var BaseUpdater = require('./_base');

/**
 * A dummy updater.
 * Does not try to stabilize the device at all: ignores IMU data.
 */
class DummyUpdater extends BaseUpdater {
	get name() {
		return 'dummy';
	}

	setTarget(target) {
		this.target = target;
	}

	update(data) {
		// Compute maximum force that a motor can deploy
		var physics = this.quad.config.physics;
		var g = physics.gravity;
		var fMax = 400 * g / 1000; // TODO

		// Controls the command precision
		// If set to 1 and if target is at max, will send full power to all motors
		var k = this.config.targetFactor; // Between 0 and 1

		// Returns delta force for each axis
		return {
			x: this.target.x / 45 * fMax * k,
			y: this.target.y / 45 * fMax * k,
			z: this.target.z / 45 * fMax * k,
		};
	}
}

module.exports = DummyUpdater;
