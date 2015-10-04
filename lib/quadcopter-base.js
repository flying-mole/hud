'use strict';

var EventEmitter = require('events').EventEmitter;
var Controller = require('./controller');

/**
 * A minimal quadcopter class.
 * It's the base for implementations. This class won't work as is.
 */
class QuadcopterBase extends EventEmitter {
	constructor(config) {
		super();

		// Private variables
		this._config = config;

		this._started = false;

		this._enabled = false;
		this._power = 0;
		this._orientation = null;
		this._motorsSpeed = null;
		this._motorsForces = null;

		// Available features
		this.features = [];

		// Initialize submodules
		this.ctrl = new Controller(this);
	}

	get started() {
		return this._started;
	}

	get enabled() {
		return this._enabled;
	}
	set enabled(val) {
		if (typeof val != 'boolean') throw new Error('Cannot set quadcopter "enabled" property: must be a boolean');

		this._enabled = val;
		this._resetMotorsSpeeds();
		this.emit('enabled', val);
	}

	get config() {
		return this._config;
	}
	set config(config) {
		if (typeof config != 'object') throw new Error('Cannot set quadcopter "config" property: must be an object');

		this._config = config;
		this.emit('config', config);
	}

	get power() {
		return this._power;
	}
	set power(val) {
		if (typeof val != 'number') throw new Error('Cannot set quadcopter "power" property: must be a number');
		if (val < 0) val = 0;
		if (val > 1) val = 1;

		this._power = val;
		this.emit('power', val);
	}

	get orientation() {
		return this._orientation;
	}
	set orientation(val) {
		this.ctrl.setTarget(val);
	}

	get motorsSpeed() {
		return this._motorsSpeed;
	}

	get motorsForces() {
		return this._motorsForces;
	}

	/**
	 * Start the quadcopter.
	 */
	start() {
		this._started = true;
		this._stabilizeLoop();

		return Promise.resolve();
	}

	/**
	 * Stop the quadcopter.
	 */
	stop() {
		this._started = false;

		this._orientation = null;
		this._motorsSpeed = null;
		this._motorsForces = null;
	}

	/**
	 * Read orientation data from IMU.
	 */
	_readOrientation(done) {
		var mockMeasure = { x: 0, y: 0, z: 0 };
		done(null, { gyro: mockMeasure, accel: mockMeasure, rotation: mockMeasure, temp: 0 });
	}

	/**
	 * Convert a mass force to a command to send to motors.
	 */
	_massToPeriod(m) {
		m *= 1000; // m was in grams when doing our tests

		var f = this.config.servos.massToPeriod;
		var T = Math.round(f[0] + f[1] * m + f[2] * m * m);

		// Make sure period is in range
		var range = this.config.servos.range;
		if (T < range[0]) T = range[0];
		if (T > range[1]) T = range[1];

		return T;
	}

	/**
	 * Stabilize the quadcopter.
	 * This method reads snesors data, computes the correction
	 * with the controller, and sends the new command to motors.
	 */
	_stabilize(done) {
		var that = this;

		var startTime = Date.now();

		// Read data from sensors
		this._readOrientation(function (err, data) {
			if (err) return done(err);

			var sensorsTime = Date.now();

			that._orientation = data;

			// Quadcopter turned off, do not stabilize
			if (!that.enabled) {
				return done(null);
			}

			// Call controller, and get back a command for motors
			var deltaForce = that.ctrl.update(data);
			if (!deltaForce) return done(null);

			// Convert forces to ESC commands
			var physics = that.config.physics;
			var g = physics.gravity;
			var fMax = 400 * g / 1000; // TODO
			var f0 = that.power * fMax;

			var axisForces = {};
			var axisSpeeds = {};
			for (var axis in deltaForce) {
				var df = deltaForce[axis];

				var f = [f0 + df / 2, f0 - df / 2];
				axisForces[axis] = f;

				var m = f.map(function (f) { return f / g; });
				axisSpeeds[axis] = m.map(function (m) { return that._massToPeriod(m); });
			}

			var speeds = [
				axisSpeeds.x[0],
				axisSpeeds.y[0],
				axisSpeeds.x[1],
				axisSpeeds.y[1]
			];

			if (that.config.debug) console.log('UPDATE speeds', speeds, deltaForce);

			// Send commands to motors
			that._setMotorsSpeeds(speeds);

			that._motorsForces = [
				axisForces.x[0],
				axisForces.y[0],
				axisForces.x[1],
				axisForces.y[1]
			];

			var endTime = Date.now();
			if (that.config.debug) console.log('Elapsed time: '+(endTime - startTime)+'ms (to read sensors: '+(endTime - sensorsTime)+'ms)');

			done(null);
		});
	}

	/**
	 * Update motors speed.
	 * @param {Number[]} speeds Array containing motors speeds.
	 */
	_setMotorsSpeeds(speeds) {
		this._motorsSpeed = speeds;
	}

	/**
	 * Reset motor speeds.
	 */
	_resetMotorsSpeeds(init) {
		var that = this;

		var speed = that.config.servos.range[0];
		if (init) {
			speed = that.config.servos.initPeriod;
		}

		this._setMotorsSpeeds([speed, speed, speed, speed]);
	}

	/**
	 * Run the quad stabilize loop.
	 * Must be called only once.
	 */
	_stabilizeLoop() {
		var that = this;

		if (!this._started) return;

		this._stabilize(function (err) {
			if (err) console.error(err);

			setTimeout(function () {
				that._stabilizeLoop();
			}, that.config.controller.interval);
		});
	}
}

module.exports = QuadcopterBase;
