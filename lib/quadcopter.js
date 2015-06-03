var servoblaster = require('servoblaster');
var Server = require('./server');
var Controller = require('./controller');
var Camera = require('./camera');
var loadSensors = require('./sensors');

var lastCmdTime = null;

function Quadcopter(config) {
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
				props.enabled = val;

				that._resetMotorSpeeds();
			}
		},
		pidEnabled: {
			enumerable: true,
			get: function () {
				return props.pidEnabled;
			},
			set: function (val) {
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
			}
		},
		power: {
			enumerable: true,
			get: function () {
				return props.power;
			},
			set: function (val) {
				props.power = val;
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

				that.ctrl.rate.x.setTarget(val.x);
				that.ctrl.rate.y.setTarget(val.y);
				that.ctrl.rate.z.setTarget(val.z);

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

	this.server = new Server(this);
	this.ctrl = new Controller(this);
	this.camera = new Camera(this);

	// TODO: propagate initial config (e.g. calibration)
}

Quadcopter.prototype.start = function (done) {
	if (!done) done = function () {};
	var that = this;

	console.log('Initializaing motors...');
	this.motors = servoblaster.createWriteStream();

	console.log('Loading sensors...');
	loadSensors(this, function (err, sensors) {
		if (err) console.error('WARN: cannot load sensors', err);
		if (!sensors) sensors = {};

		that.sensors = sensors;

		console.log('Starting server...');
		that.server.listen(function () {
			// Ready :-)
			that._resetMotorSpeeds(true);
			that._stabilizeLoop();

			done();
		});
	});
};

Quadcopter.prototype._readOrientation = function (done) {
	var that = this;

	if (!this.sensors.mpu6050) {
		return done('MPU6050 not available');

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
	var f = this.config.servos.massToPeriod;
	var T = Math.round(f[0] + f[1] * m + f[2] * m * m);

	// Make sure period is in range
	var range = this.config.servos.range;
	//if (T < range[0]) T = range[0];
	//if (T > range[1]) T = range[1];

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

		// Quadcopter on ground, do not use PIDs
		if (that.pidEnabled && that.power >= 0.2) {
			var ctrl = that.ctrl;

			// Corrections
			var delta = {
				// TODO: stabilize PIDs not used now
				stabilize: {
					x: ctrl.stabilize.x.update(data.rotation.x),
					y: ctrl.stabilize.y.update(data.rotation.y)
				},
				rate: {
					x: ctrl.rate.x.update(data.gyro.x),
					y: ctrl.rate.y.update(data.gyro.y),
					z: ctrl.rate.z.update(data.gyro.z)
				}
			};

			var currentTime = Date.now();
			var update = (lastReadTime !== null);
			var dt;
			if (update) {
				dt = currentTime - lastReadTime;
			}
			lastReadTime = currentTime;
			if (!update) return done(null);

			// Update motors speed

			var physics = that.config.physics;
			delta.force = {};
			for (var axis in delta.rate) {
				var d = delta.rate[axis];

				// Convert to accel
				var a = d / dt;

				// Convert to force
				var f = a * physics.mass * physics.diagonalLength / 3;

				delta.force[axis] = f;
			}
		} else {
			var ctrl = that.ctrl;
			var physics = that.config.physics;
			var g = physics.gravity;
			var fMax = physics.mass * g; // TODO
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
		var fMax = physics.mass * g; // TODO
		var f0 = that.power * fMax;

		var axisSpeeds = {};
		for (var axis in delta.force) {
			var df = delta.force[axis];
			var f = [f0 + df, f0 - df];
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
