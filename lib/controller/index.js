'use strict';

var EventEmitter = require('events').EventEmitter;

// Available updaters
var updatersNames = ['dummy', /*'rate',*/ 'rate-simple', 'stabilize-simple', 'physics'];

// require() updaters
var updaters = {};
updatersNames.forEach(function (name) {
	updaters[name] = require('./'+name);
});

class Controller extends EventEmitter {
	constructor(quad) {
		super();

		this.quad = quad;

		// Instanciate updaters
		this.updaters = {};
		for (var updaterName in updaters) {
			var updater = new updaters[updaterName](quad);

			// Ensure each updater has a valid target
			updater.setTarget({ x: 0, y: 0, z: 0 });

			this.updaters[updaterName] = updater;
		}
	}

	_currentUpdater() {
		var updaterName = this.quad.config.controller.updater;
		return this.updaters[updaterName];
	}

	/**
	 * Update the controller target.
	 */
	setTarget(target) {
		this._currentUpdater().setTarget(target);
	}

	/**
	 * Reset the controller.
	 */
	reset() {
		this._currentUpdater().reset();
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

	static get available() {
		return updatersNames;
	}
}

module.exports = Controller;
