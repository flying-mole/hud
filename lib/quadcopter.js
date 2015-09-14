'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var servoblaster = require('servoblaster');
var Server = require('./server');
var Controller = require('./controller');
var Camera = require('./camera');
var loadSensors = require('./sensors');

class Quadcopter extends EventEmitter {
	constructor(config) {
		super();

		this._config = config;

		this._enabled = false;
		this._power = 0;
		this._motorsSpeed = null;
		this._motorForces = null;
		
		this.features = [];

		// Initialize submodules
		this.server = new Server(this);
		this.ctrl = new Controller(this);
		this.camera = new Camera(this);
	
		// TODO: propagate initial config (e.g. calibration)
	}
	
	get enabled() {
		return this._enabled;
	}
	set enabled(val) {
		if (typeof val != 'boolean') throw new Error('Cannot set quadcopter "enabled" property: must be a boolean');
		
		this._enabled = val;
		this._resetMotorSpeeds();
		this.emit('enabled', val);
	}
	
	get config() {
		return this._config;
	}
	set config(config) {
		this._config = config;

		// TODO: propagate config changes

		// Calibration
		var cal = config.mpu6050.calibration;
		if (cal.gyro) this.sensors.mpu6050.calibrateGyro(cal.gyro);
		if (cal.accel) this.sensors.mpu6050.calibrateAccel(cal.accel);

		// PID values
		// TODO
		/*Object.keys(config.pid.values).forEach(function (type) {
			Object.keys(config.pid.values[type]).forEach(function (axis) {
				var pidValues = config.pid.values[type][axis];
				var pid = that.ctrl[type][axis];

				pid.k_p = pidValues[0];
				pid.k_i = pidValues[1];
				pid.k_d = pidValues[2];
			});
		});*/

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
		this._orientation = val;
	}
	
	get rotationSpeed() {
		return this._rotationSpeed;
	}
	set rotationSpeed(val) {
		this._rotationSpeed = val;
		
		console.log('SET target', val);
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
		var that = this;

		console.log('Initializaing motors...');

		this.motors = servoblaster.createWriteStream();
		this.motors.on('open', function () {
			that.features.push('motors');
		});
		this.motors.on('error', function (err) {
			console.error('WARN: cannot initialize motors', err);
		});

		console.log('Loading sensors...');
		loadSensors(this).catch(function (err) {
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

			that._resetMotorSpeeds(true);
			that._stabilizeLoop();
		});
	}
	
	/**
	 * Read orientation data from IMU.
	 */
	_readOrientation(done) {
		if (!this.sensors.mpu6050) {
			return done(null, null);
			//return done('MPU6050 not available');
		}

		this.sensors.mpu6050.read(done);
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

		this._readOrientation(function (err, data) {
			if (err) return done(err);

			var sensorsTime = Date.now();

			that._orientation = data;

			// Quadcopter turned off, do not stabilize
			if (!that.enabled) {
				return done(null);
			}

			var delta = {};
			delta.force = that.ctrl.update(data);
			if (!delta.force) return done(null);
	
			// Convert forces to motor periods
			var physics = that.config.physics;
			var g = physics.gravity;
			var fMax = 400 * g / 1000; // TODO
			var f0 = that.power * fMax;

			var axisForces = {};
			var axisSpeeds = {};
			for (var axis in delta.force) {
				var df = delta.force[axis];
	
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
	
			console.log('UPDATE speeds', speeds, delta.force);
	
			that.config.servos.pins.forEach(function (pin, i) {
				that.motors.write({ pin: pin, value: speeds[i] });
			});
	
			that._motorsSpeed = speeds;
	
			that._motorsForces = [
				axisForces.x[0],
				axisForces.y[0],
				axisForces.x[1],
				axisForces.y[1]
			];
	
			var endTime = Date.now();
			console.log('Elapsed time: '+(endTime - startTime)+'ms (to read sensors: '+(endTime - sensorsTime)+'ms)');
	
			done(null);
		});
	}
	
	/**
	 * Reset motor speeds.
	 */
	_resetMotorSpeeds(init) {
	    var that = this;
	
	    var speed = that.config.servos.range[0];
	    if (init) {
	    	speed = that.config.servos.initPeriod;
	    }
	
	    this.config.servos.pins.forEach(function (pin, i) {
			that.motors.write({ pin: pin, value: speed });
		});
	
		this._motorsSpeed = [speed, speed, speed, speed];
	}

	/**
	 * Run the stabilize loop.
	 * Must be called only once.
	 */
	_stabilizeLoop() {
		var that = this;
	
		this._stabilize(function (err) {
			if (err) console.error(err);
	
			setTimeout(function () {
				that._stabilizeLoop();
			}, that.config.pid.interval);
		});
	}
}

module.exports = Quadcopter;
