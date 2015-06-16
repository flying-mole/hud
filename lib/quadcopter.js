var util = require('util');
var EventEmitter = require('events').EventEmitter;
var servoblaster = require('servoblaster');
var Server = require('./server');
var Controller = require('./controller');
var Camera = require('./camera');
var loadSensors = require('./sensors');

var lastCmdTime = null;

function Quadcopter(config) {
	EventEmitter.call(this);

	var props = {
		enabled: false,
		pidEnabled: true,
		power: 0,
		motorsSpeed: null
	};
	this._props = props;

	var that = this;

	Object.defineProperties(this, {
		enabled: {
			enumerable: true,
			get: function () {
				return props.enabled;
			},
			set: function (val) {
				if (typeof val != 'boolean') throw new Error('Cannot set quadcopter "enabled" property: must be a boolean');

				props.enabled = val;
				that._resetMotorSpeeds();
				that.emit('enabled', val);
			}
		},
		pidEnabled: {
			enumerable: true,
			get: function () {
				return props.pidEnabled;
			},
			set: function (val) {
				if (typeof val != 'boolean') throw new Error('Cannot set quadcopter "pidEnabled" property: must be a boolean');
				props.pidEnabled = val;
			}
		},
		config: {
			enumerable: true,
			get: function () {
				return config;
			},
			set: function (val) {
				config = val;

				// TODO: propagate config changes

				// Calibration
				var cal = config.mpu6050.calibration;
				if (cal.gyro) that.sensors.mpu6050.calibrateGyro(cal.gyro);
				if (cal.accel) that.sensors.mpu6050.calibrateAccel(cal.accel);

				// Broadcast interval
				that.server._setInterval();
				
				// Update PID values
				Object.keys(config.pid.values).forEach(function (type) {
					Object.keys(config.pid.values[type]).forEach(function (axis) {
						var pidValues = config.pid.values[type][axis];
						var pid = that.ctrl[type][axis];

						pid.k_p = pidValues[0];
						pid.k_i = pidValues[1];
						pid.k_d = pidValues[2];
					});
				});
			}
		},
		power: {
			enumerable: true,
			get: function () {
				return props.power;
			},
			set: function (val) {
				if (typeof val != 'number') throw new Error('Cannot set quadcopter "power" property: must be a number');
				if (val < 0) val = 0;
				if (val > 1) val = 1;

				props.power = val;
				that.emit('power', val);
			}
		},
		orientation: {
			enumerable: true,
			get: function () {
				return props.orientation;
			},
			set: function (val) {
				props.orientation = val;
			}
		},
		rotationSpeed: { // TODO: remove this (just for testing)
			enumerable: true,
			get: function () {
				return props.rotationSpeed;
			},
			set: function (val) {
				props.rotationSpeed = val;

				Object.keys(that.ctrl.rate).forEach(function (axis) {
					that.ctrl.rate[axis].setTarget(val[axis]);

					// Reset intergal term
					// TODO: find something better?
					that.ctrl.rate[axis].sumError = 0;
				});

				lastCmdTime = new Date().getTime();
			}
		},
		motorsSpeed: {
			enumerable: true,
			get: function () {
				return props.motorsSpeed;
			}
		}
	});

	this.features = [];

	this.server = new Server(this);
	this.ctrl = new Controller(this);
	this.camera = new Camera(this);

	// TODO: propagate initial config (e.g. calibration)
}
util.inherits(Quadcopter, EventEmitter);

Quadcopter.prototype.start = function (done) {
	if (!done) done = function () {};
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
	loadSensors(this, function (err, sensors) {
		if (err) console.error('WARN: cannot load sensors', err);
		if (!sensors) sensors = {};

		that.sensors = sensors;
		if (that.sensors.mpu6050) {
			that.features.push('imu'); // Inertial Measurement Unit
		}

		console.log('Starting server...');
		that.server.listen(function () {
			console.log('Checking camera...');
			that.camera.isAvailable(function (err, cameraAvailable) {
				if (err) console.error('WARN: cannot check camera', err);
				if (cameraAvailable) that.features.push('camera');

				// Ready :-)
				console.log('Flying Mole ready.');

				that._resetMotorSpeeds(true);
				that._stabilizeLoop();

				done();
			});
		});
	});
};

Quadcopter.prototype._readOrientation = function (done) {
	var that = this;

	if (!this.sensors.mpu6050) {
		return done(null, null);
		//return done('MPU6050 not available');

		// Return fake data
		/*var that = this;
		setTimeout(function () {
			var orientation = that.server.msgBuilder.orientation().data;
			var ctrl = that.ctrl;

			var err = {
				x: 0,
				y: 0,
				z: 0
			};
			if (lastCmdTime !== null) {
				var dt = new Date().getTime() - lastCmdTime;
				dt = 1/dt;

				var factor = 2;
				err = {
					x: dt * (orientation.gyro.x - ctrl.rate.x.target) * factor,
					y: dt * (orientation.gyro.y - ctrl.rate.y.target) * factor,
					z: dt * (orientation.gyro.z - ctrl.rate.z.target) * factor
				};
			}

			done(null, {
				gyro: {
					x: ctrl.rate.x.target - err.x,
					y: ctrl.rate.y.target - err.y,
					z: ctrl.rate.z.target - err.z
				},
				accel: { x: 0, y: 0, z: 0 },
				rotation: {
					x: ctrl.stabilize.x.target,
					y: ctrl.stabilize.y.target,
					z: ctrl.stabilize.z.target
				},
				temp: 0
			});
		}, 20);*/
		return;
	}

	this.sensors.mpu6050.read(done);
};

Quadcopter.prototype._massToPeriod = function (m) {
	m *= 1000; // m was in grams when doing our tests

	var f = this.config.servos.massToPeriod;
	var T = Math.round(f[0] + f[1] * m + f[2] * m * m);

	// Make sure period is in range
	var range = this.config.servos.range;
	if (T < range[0]) T = range[0];
	if (T > range[1]) T = range[1];

	return T;
}

var lastReadTime = null;
Quadcopter.prototype._stabilize = function (done) {
	var that = this;

	this._readOrientation(function (err, data) {
		if (err) return done(err);

		that._props.orientation = data;

		// Quadcopter turned off, do not stabilize
		if (!that.enabled) {
			return done(null);
		}

		// IMU not available OR PID disabled OR quadcopter on ground:
		// Do not use PIDs
		if (data && that.pidEnabled/* && that.power >= 0.2*/) {
			var ctrl = that.ctrl;

			// Compute last update time
			var currentTime = Date.now();
			var update = (lastReadTime !== null);
			var dt;
			if (update) {
				dt = currentTime - lastReadTime;
				// Milliseconds to seconds
				dt /= 1000;
			}
			lastReadTime = currentTime;
			if (!update) return done(null);

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
			
			// grams to kg
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
		} else {
			var ctrl = that.ctrl;
			var physics = that.config.physics;
			var g = physics.gravity;
			var fMax = 400 * g / 1000; // TODO
			var delta = {};
			delta.force = {
				x: ctrl.rate.x.target / 45 * fMax / 10,
				y: ctrl.rate.y.target / 45 * fMax / 10,
				z: ctrl.rate.z.target / 45 * fMax / 10,
			};
		}

		// Convert forces to motor periods
		var physics = that.config.physics;
		var g = physics.gravity;
		var fMax = 400 * g / 1000; // TODO
		var f0 = that.power * fMax;

		var axisSpeeds = {};
		for (var axis in delta.force) {
			var df = delta.force[axis];
			var f = [f0 + df / 2, f0 - df / 2];
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

		that._props.motorsSpeed = speeds;

		done(null);
	});
};

Quadcopter.prototype._resetMotorSpeeds = function (init) {
    var that = this;

    var speed = that.config.servos.range[0];
    if (init) {
    	speed = that.config.servos.initPeriod;
    }

    this.config.servos.pins.forEach(function (pin, i) {
		that.motors.write({ pin: pin, value: speed });
	});

	this._props.motorsSpeed = [speed, speed, speed, speed];
};

Quadcopter.prototype._stabilizeLoop = function () {
	var that = this;

	this._stabilize(function (err) {
		if (err) console.error(err);

		setTimeout(function () {
			that._stabilizeLoop();
		}, that.config.pid.interval);
	});
};

module.exports = Quadcopter;
