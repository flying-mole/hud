'use strict';

var QuadcopterBase = require('./quadcopter-base');
var Server = require('./server');
var Camera = require('./camera');
var loadSensors = require('./sensors');
var loadMotors = require('./motors');

/**
 * The main quadcopter implementation.
 * It's the core component, it manages communication between all components.
 */
class Quadcopter extends QuadcopterBase {
	constructor(config) {
		super(config);

		// Initialize submodules
		this.server = new Server(this);
		this.camera = new Camera(this);

		// TODO: propagate initial config (e.g. calibration)
	}

	/**
	 * Start the quadcopter.
	 */
	start() {
		var that = this;
		var start = super.start;

		// Load motors
		console.log('Loading motors...');
		loadMotors(this).then(function (motors) {
			that.motors = motors;
			that.features.push('motors');

			that._resetMotorsSpeeds(true);
		}, function (err) {
			console.error('WARN: cannot load motors', err);
		});

		// Then Inertial Measurement Unit
		console.log('Loading sensors...');
		var promise = loadSensors(this).catch(function (err) {
			console.error('WARN: cannot load sensors', err);
		}).then(function (sensors) {
			that.sensors = sensors || {};
			if (that.sensors.mpu6050) {
				that.features.push('imu'); // Inertial Measurement Unit
			}

			// Start server
			console.log('Starting server...');
			return that.server.listen();
		}).then(function () {
			// Check if camera is available
			console.log('Checking camera...');
			return that.camera.check().then(function () {
				that.features.push('camera');
			}, function (err) {
				console.error('WARN: camera not available', err);
			});
		}).then(function () {
			// Ready :-)
			console.log('Flying Mole ready.');

			// Call parent method to finish the work
			start.call(that);
		});

		return promise;
	}

	/**
	 * Stop the quadcopter.
	 */
	stop() {
		this._resetMotorsSpeeds(true);
		if (this.motors) {
			this.motors.end();
		}

		// TODO: cleanup sensors, camera

		this.server.close();

		super.stop();
	}

	/**
	 * Read orientation data from IMU.
	 * @param {Function} done The callback.
	 */
	_readOrientation(done) {
		if (!this.sensors.mpu6050) {
			// IMU not available, return mock data
			return super._readOrientation(done);
		}

		var config = this.config;

		this.sensors.mpu6050.read(function (err, data) {
			data.rotation.x *= -1; // TODO: fix this

			// Calibration
			var cal = config.mpu6050.calibration || {};

			for (var type in cal) {
				for (var axis in cal[type]) {
					data[type][axis] += cal[type][axis];
				}
			}

			done(err, data);
		});
	}

	/**
	 * Update motors speed.
	 * @param {Number[]} speeds Array containing motors speeds.
	 */
	_setMotorsSpeeds(speeds) {
		var that = this;

		super._setMotorsSpeeds(speeds);

		if (!this.motors) return; // Motors not available, exit silently

		this.config.servos.pins.forEach(function (pin, i) {
			that.motors.write({ pin: pin, value: speeds[i] });
		});
	}
}

module.exports = Quadcopter;
