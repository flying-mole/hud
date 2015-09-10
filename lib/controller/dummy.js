/**
 * A dummy updater.
 * Does not try to stabilize the device at all: ignores IMU data.
 */

module.exports = function (quad, ctrl) {
	return function () {
		// Compute maximum force that a motor can deploy
		var physics = quad.config.physics;
		var g = physics.gravity;
		var fMax = 400 * g / 1000; // TODO

		// Controls the command precision
		// If set to 1 and if target is at max, will send full power to all motors
		var k = 1/5; // Between 0 and 1

		// Returns delta force for each axis
		return {
			x: ctrl.target.x / 45 * fMax * k,
			y: ctrl.target.y / 45 * fMax * k,
			z: ctrl.target.z / 45 * fMax * k,
		};
	};
};
