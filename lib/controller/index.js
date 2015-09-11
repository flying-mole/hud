'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;

// Available updaters
var updatersNames = ['dummy', 'rate', 'rate-simple', 'stabilize-simple'];

// require() updaters
var updaters = {};
updatersNames.forEach(function (name) {
	updaters[name] = require('./'+name);
});

class Controller extends EventEmitter {
	constructor(quad) {
		this.quad = quad;

		var that = this;

		// Initialize controller targets
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

	/**
	 * Update this controller target.
	 */
	setTarget(target) {
		this.target = target;
		this.emit('target', target);

		// TODO: reset integral term for PIDs?
		// What about other terms?
	}
	
	/**
	 * Reset the controller.
	 */
	reset() {
		this.emit('reset');
	}
	
	/**
	 * Feed the controller with new data from sensors,
	 * and get the new correction for motors.
	 * Returns an object containg x, y, z keys with forces delta.
	 */
	update(data) {
		var updater = this.quad.config.pid.controller;

		// IMU not available OR quadcopter on ground:
		// Do not use PIDs
		if (!data/* || this.quad.power <= 0.2*/) {
			updater = 'dummy';
		}

		// Get the result from the currently enabled updater
		// If the updater returns a string, use this string as updater
		// TODO: deprecate this feature?
		while (true) {
			var result = this.updaters[updater](data);
			if (typeof result == 'string') {
				updater = result;
			} else {
				return result;
			}
		}
	}
}

Controller.available = updatersNames;

module.exports = Controller;
