var PidController = require('node-pid-controller');

var updatersNames = ['dummy', 'rate', 'rate-simple', 'stabilize-simple'];

var updaters = {};
updatersNames.forEach(function (name) {
	updaters[name] = require('./'+name);
});

function Controller(quad) {
	this.quad = quad;

	var config = quad.config;

	// PIDs
	// TODO: add setTarget() instead of using PIDs: some controllers don't use PIDs
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

	// Instanciate updaters
	this.updaters = {};
	for (var updaterName in updaters) {
		this.updaters[updaterName] = updaters[updaterName](quad, this);
	}
}

Controller.prototype.update = function (data) {
	var updater = this.quad.config.pid.controller;
	
	// IMU not available OR quadcopter on ground:
	// Do not use PIDs
	if (!data/* || this.quad.power <= 0.2*/) {
		updater = 'dummy';
	}

	while (true) {
		var result = this.updaters[updater](data);
		if (typeof result == 'string') {
			updater = result;
		} else {
			return result;
		}
	}
};

Controller.available = updatersNames;

module.exports = Controller;