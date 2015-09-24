'use strict';

var QuadcopterBase = require('./quadcopter-base');
var Server = require('./server');
var Camera = require('./camera');
var loadSensors = require('./sensors');
var loadMotors = require('./motors');

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

		console.log('Loading motors...');
		loadMotors(this).then(function (motors) {
			that.motors = motors;
			that.features.push('motors');

			that._resetMotorSpeeds(true);
		}, function (err) {
			console.error('WARN: cannot load motors', err);
		});

		console.log('Loading sensors...');
		var promise = loadSensors(this).catch(function (err) {
			console.error('WARN: cannot load sensors', err);
		}).then(function (sensors) {
			that.sensors = sensors || {};
			if (that.sensors.mpu6050) {
				that.features.push('imu'); // Inertial Measurement Unit
			}

			console.log('Starting server...');
			return that.server.listen();
		}).then(function () {
			console.log('Checking camera...');
			return that.camera.check().then(function () {
				that.features.push('camera');
			}, function (err) {
				console.error('WARN: camera not available', err);
			});
		}).then(function () {
			// Ready :-)
			console.log('Flying Mole ready.');

			start.call(that);
		});

		return promise;
	}

	/**
	 * Stop the quadcopter.
	 */
	stop() {
		if (this.motors) {
			this.motors.end();
		}

		// TODO: cleanup sensors, camera
		
		this.server.close();

		super.stop();
	}

	/**
	 * Read orientation data from IMU.
	 */
	_readOrientation(done) {
		if (!this.sensors.mpu6050) {
			return super._readOrientation(done);
		}

		this.sensors.mpu6050.read(done);
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
