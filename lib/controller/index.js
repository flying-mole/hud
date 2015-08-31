var util = require('util');
var EventEmitter = require('events').EventEmitter;

var updatersNames = ['dummy', 'rate', 'rate-simple', 'stabilize-simple'];

var updaters = {};
updatersNames.forEach(function (name) {
	updaters[name] = require('./'+name);
});

function Controller(quad) {
	EventEmitter.call(this);

	this.quad = quad;

	var that = this;

	// Target
	this.target = {};
	['x', 'y', 'z'].forEach(function (axis) {
		that.target[axis] = 0;
	});

	// Instanciate updaters
	this.updaters = {};
	for (var updaterName in updaters) {
		this.updaters[updaterName] = updaters[updaterName](quad, this);
	}
}
util.inherits(Controller, EventEmitter);

Controller.prototype.setTarget = function (target) {
	this.target = target;
	this.emit('target', target);

	// TODO: reset integral term for PIDs?
	// What about other terms?
};

Controller.prototype.reset = function () {
	this.emit('reset');
};

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