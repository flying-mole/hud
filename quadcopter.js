var servoblaster = require('servoblaster');
var Server = require('./server');
var Controller = require('./controller');
var loadSensors = require('./sensors');
var config = require('./config');

function Quadcopter() {
	var props = {
		enabled: false,
		power: 0,
		motorsSpeed: null
	};
	this._props = props;

	Object.defineProperties(this, {
		enabled: {
			enumerable: true,
			get: function () {
				return props.enabled;
			},
			set: function (val) {
				props.enabled = val;
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
			that._stabilizeLoop();

			done();
		});
	});
};

var lastCmdTime = null;
Quadcopter.prototype._readOrientation = function (done) {
	if (!this.sensors.mpu6050) {
		//return done('MPU6050 not available');

		// Return fake data
		var that = this;
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
		}, 20);
		return;
	}

	this.sensors.mpu6050.read(done);
};

Quadcopter.prototype._stabilize = function (done) {
	var that = this;

	this._readOrientation(function (err, data) {
		if (err) return done(err);

		that._props.orientation = data;

		if (!that.enabled) {
			return done(null);
		}

		var ctrl = that.ctrl;

		// Corrections
		var delta = {
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

		console.log('UPDATE orientation', delta);

		// Update motors speed
		// TODO: this is a delta. Update last speed instead of power.
		var power = that.power * 200;
		var speeds = [
			power + delta.rate.x,
			power + delta.rate.y,
			power - delta.rate.x,
			power - delta.rate.y
		];

		that.config.servos.pins.forEach(function (pin, i) {
			that.motors.write({ pin: pin, value: speeds[i] });
		});

		that._props.motorsSpeed = speeds.map(function (speed) { return speed / 200; });

		done(null);
	});
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