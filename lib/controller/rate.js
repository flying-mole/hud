/**
 * A rate updater.
 * Tries to adjust the rate (ie. angular speed) from gyro data.
 */

module.exports = function (quad, ctrl) {
	var lastTime;

	return function (data) {
		// Compute last update time
		var currentTime = Date.now();
		var dt = 0;
		if (lastTime) {
			dt = currentTime - lastTime;
			// Milliseconds to seconds
			dt /= 1000;
		}
		lastTime = currentTime;

		// PIDs
		var delta = {};

		// Stabilize PIDs
		// TODO: stabilize PIDs not used now
		/*delta.stabilize = {
			x: ctrl.stabilize.x.update(data.rotation.x),
			y: ctrl.stabilize.y.update(data.rotation.y)
		};

		delta.rate = {};
		for (var axis in delta.stabilize) {
			var d = delta.stabilize[axis];
			//var alpha = data.gyro[axis] + d;

			// Convert angle to angular speed
			// TODO: we must use (lastAlpha - alpha) / dt
			//var s = alpha / dt;

			// TODO: for stabilized control
			//delta.rate[axis] = ctrl.rate[axis].update(s);
		}

		// We do not have a compass for now
		// z target is z command, no stabilize PID for this axis
		delta.rate.z = ctrl.rate.z.update(data.gyro.z);*/

		// Rate PIDs
		delta.rate = {
			x: ctrl.rate.x.update(data.gyro.x),
			y: ctrl.rate.y.update(data.gyro.y),
			z: ctrl.rate.z.update(data.gyro.z)
		};

		// Update motors speed
		var physics = quad.config.physics;

		var structM = physics.structureMass / 1000; // g to kg
		var motorM = physics.motorMass / 1000; // g to kg
		var d = physics.diagonalLength / 100; // cm to m, distance between two motors
		var boxM = physics.boxMass / 1000; // g to kg
		var boxH = physics.boxHeight / 100; // cm to m
		
		var Q = d / 2 * (structM / 3 + 2 * motorM) + boxM * boxH * boxH * 2 / d;

		delta.force = {};
		for (var axis in delta.rate) {
			var d = delta.rate[axis];

			// Convert angular speed to force
			var df = d / dt / Q;

			delta.force[axis] = df;
		}

		return delta.force;
	};
};