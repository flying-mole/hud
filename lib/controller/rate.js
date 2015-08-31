/**
 * A rate updater.
 * Tries to adjust the rate (ie. angular speed) from gyro data.
 */

var PidController = require('node-pid-controller');

module.exports = function (quad, ctrl) {
	var lastTime;
	var config = quad.config;

	var pids = {};
	['x', 'y', 'z'].forEach(function (axis) {
		var cst = config.pid.values.rate[axis];
		var ctrl = new PidController(cst[0], cst[1], cst[2], true);
		ctrl.setTarget(0);
		pids[axis] = ctrl;
	});

	ctrl.on('reset', function () {
		for (var axis in pids) {
			var pid = pids[axis];
			pid.setTarget(0);
			pid.reset();
		}
	});

	ctrl.on('target', function (target) {
		for (var axis in target) {
			var t = target[axis];

			pids[axis].setTarget(t);
		}
	});

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

		var delta = {};

		// Rate PIDs
		delta.rate = {
			x: pids.x.update(data.gyro.x),
			y: pids.y.update(data.gyro.y),
			z: pids.z.update(data.gyro.z)
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