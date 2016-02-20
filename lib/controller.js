'use strict';

var fs = require('fs');
var path = require('path');
var EventEmitter = require('events').EventEmitter;

function loadUpdaters() {
	var dir = 'controller';

	var updaters = {};
	fs.readdirSync(__dirname+'/'+dir).forEach(function (file) {
		var name = path.basename(file, '.js');
		if (name[0] === '_') return;

		updaters[name] = require('./'+dir+'/'+name);
	});
	return updaters;
}

var updaters = loadUpdaters();
var currentUpdater = Symbol();

class Controller extends EventEmitter {
	constructor(quad) {
		super();

		var that = this;
		this.quad = quad;

		// Instanciate updaters
		this.updaters = {};
		for (var updaterName in updaters) {
			var updater = new updaters[updaterName](quad);

			// Ensure each updater has a valid target
			updater.setTarget({ x: 0, y: 0, z: 0 });

			this.updaters[updaterName] = updater;
		}

		// Reset controllers when the quad is turned off
		quad.on('enabled', function (val) {
			if (!val) {
				that.reset();
			}
		});
	}

	/**
	 * Get the current updater.
	 * @return BaseUpdater
	 * @private
	 */
	[currentUpdater]() {
		var updaterName = this.quad.config.controller.updater;
		return this.updaters[updaterName];
	}

	/**
	 * Update the controller target.
	 */
	setTarget(target) {
		this[currentUpdater]().setTarget(target);
	}

	/**
	 * Reset the controller.
	 */
	reset() {
		for (var name in this.updaters) {
			this.updaters[name].reset();
		}
	}

	/**
	 * Feed the controller with new data from sensors,
	 * and get the new correction for motors.
	 * Returns an object containg x, y, z keys with forces delta.
	 */
	update(data) {
		var updaterName = this.quad.config.controller.updater;

		// IMU not available OR quadcopter on ground:
		// Do not use PIDs
		if (!data/* || this.quad.power <= 0.2*/) {
			updaterName = 'dummy';
		}

		// Get the result from the currently enabled updater
		// If the updater returns a string, use this string as updater
		// TODO: deprecate this feature?
		var result;
		while (true) {
			var updater = this.updaters[updaterName];
			if (!updater) {
				throw new Error('Updater '+updaterName+' not available');
			}

			result = updater.update(data);
			if (typeof result == 'string') {
				updaterName = result;
			} else {
				break;
			}
		}

		return result;
	}

	/**
	 * Get available updaters.
	 * @return String[]
	 */
	static get available() {
		return Object.keys(updaters);
	}
}

module.exports = Controller;
