var PidController = require('node-pid-controller');

function Controller(quad) {
	this.quad = quad;

	var config = quad.config;

	var ctrlTypes = ['rate', 'stabilize'];
	var ctrlAxis = ['x', 'y', 'z'];
	var that = this;
	ctrlTypes.forEach(function (type) {
		that[type] = {};
		ctrlAxis.forEach(function (axis) {
			var cst = config.pid.values[type][axis];
			var ctrl = new PidController(cst[0], cst[1], cst[2], true);
			ctrl.setTarget(0);
			that[type][axis] = ctrl;
		});
	});

	this.lastTime = 0;
}

Controller.prototype.update = function (data) {
	var ctrl = this;

	// Compute last update time
	var currentTime = Date.now();
	var dt = 0;
	if (this.lastTime !== 0) {
		dt = currentTime - this.lastTime;
		// Milliseconds to seconds
		dt /= 1000;
	}
	this.lastTime = currentTime;
	
	if (dt == 0) return;

	// PIDs
	var delta = {};

	// Stabilize PIDs
	// TODO: stabilize PIDs not used now
	delta.stabilize = {
		x: ctrl.stabilize.x.update(data.rotation.x),
		y: ctrl.stabilize.y.update(data.rotation.y)
	};

	delta.rate = {};
	for (var axis in delta.stabilize) {
		var d = delta.stabilize[axis];
		var alpha = data.gyro[axis] + d;

		// Convert angle to angular speed
		var s = alpha / dt;

		// TODO: for stabilized control
		//delta.rate[axis] = ctrl.rate[axis].update(s);
	}

	// We do not have a compass for now
	// z target is z command, no stabilize PID for this axis
	delta.rate.z = ctrl.rate.z.update(data.gyro.z);

	// Rate PIDs
	delta.rate = {
		x: ctrl.rate.x.update(data.gyro.x),
		y: ctrl.rate.y.update(data.gyro.y),
		z: ctrl.rate.z.update(data.gyro.z)
	};

	// Update motors speed
	var physics = that.config.physics;

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

module.exports = Controller;