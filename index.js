var os = require('os');
var bson = require('bson');
var express = require('express');
var i2c = require('i2c-bus');
var MPU6050 = require('i2c-mpu6050');
var servoblaster = require('servoblaster');
var PidController = require('node-pid-controller');

var config = require('./config');

var BSON = bson.BSONPure.BSON;
var app = express();
var expressWs = require('express-ws')(app);

// MPU6050
var i2cDev, mpu6050;
try {
	i2cDev = i2c.openSync(config.mpu6050.device);
	mpu6050 = new MPU6050(i2cDev, parseInt(config.mpu6050.address));
} catch (err) {
	console.error('ERR: could not open MPU6050 I2C interface', err);
}

// Servo
var servo = servoblaster.createWriteStream();

// PID
var ctrlTypes = ['rate', 'stabilize'];
var ctrlAxis = ['x', 'y', 'z'];
var ctrl = {};
ctrlTypes.forEach(function (type) {
	ctrl[type] = {};
	ctrlAxis.forEach(function (axis) {
		var cst = config.pid.values[type][axis];
		ctrl[type][axis] = new PidController(cst[0], cst[1], cst[2]);
		ctrl[type][axis].setTarget(0);
	});
});

// Websockets
var clients = [];
function broadcast(msg) {
	clients.forEach(function (ws) {
		ws.send(BSON.serialize(msg));
	});
}

function getAppInfo() {
	return {
		type: 'info',
		msg: 'Flying Mole 0.1.0 - welcome dear mole!'
	};
}

function getOsStats() {
	return {
		type: 'os-stats',
		loadavg: os.loadavg(),
		mem: {
			total: os.totalmem(),
			free: os.freemem()
		}
	};
}

var orientation = null, power = 0, motorsSpeed = null;
var lastCmdTime = null;
function readOrientation(done) {
	var gotData = function (err, data) {
		if (err) return done(err);

		orientation = data;

		// Corrections
		var delta = {
			/*stabilize: {
				x: ctrl.stabilize.x.update(data.rotation.x),
				y: ctrl.stabilize.y.update(data.rotation.y)
			},*/
			rate: {
				x: ctrl.rate.x.update(data.gyro.x),
				y: ctrl.rate.y.update(data.gyro.y),
				z: ctrl.rate.z.update(data.gyro.z)
			}
		};

		console.log('UPDATE orientation', delta);

		// Update motors speed
		var speeds = [
			power + delta.rate.x,
			power + delta.rate.y,
			power - delta.rate.x,
			power - delta.rate.y
		];

		config.servos.pins.forEach(function (pin, i) {
			servo.write({ pin: pin, value: speeds[i] });
		});

		motorsSpeed = speeds.map(function (speed) { return speed / 200; });

		done(null);
	};

	if (!mpu6050) {
		//return done('MPU6050 not available');

		// Return fake data
		setTimeout(function () {
			var dt = 0;
			if (lastCmdTime === null) {
				dt = lastCmdTime - new Date().getTime();
			}

			var orientation = getOrientation().data;

			gotData(null, {
				gyro: {
					x: ctrl.rate.x.target - dt * (orientation.gyro.x - ctrl.rate.x.target) * 0.1,
					y: ctrl.rate.y.target - dt * (orientation.gyro.y - ctrl.rate.y.target) * 0.1,
					z: ctrl.rate.z.target - dt * (orientation.gyro.z - ctrl.rate.z.target) * 0.1
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

	mpu6050.read(gotData);
}

function ctrlLoop() {
	readOrientation(function (err) {
		if (err) console.error(err);

		setTimeout(function () {
			ctrlLoop();
		}, config.pid.interval);
	});
}

function getOrientation() {
	return {
		type: 'orientation',
		data: orientation || {
			gyro: { x: 0, y: 0, z: 0 },
			accel: { x: 0, y: 0, z: 0 },
			rotation: { x: 0, y: 0 },
			temp: 0
		}
	};
}

function getMotorsSpeed() {
	return {
		type: 'motors-speed',
		speed: motorsSpeed || [0, 0, 0, 0]
	};
}

// Command handlers
var handlers = {
	power: function (val) {
		power = Math.round(val * 200);
		console.log('SET power:', power);
	},
	orientation: function (data) {
		// TODO: stabilize pids
		// TODO: alpha
		ctrl.stabilize.x.setTarget(data.beta);
		ctrl.stabilize.y.setTarget(data.gamma);

		console.log('SET orientation:', data);
	},
	'rotation-speed': function (data) { // TODO: remove this (just for testing)
		// Update rotation speed (deg/s)
		ctrl.rate.x.setTarget(data.x);
		ctrl.rate.y.setTarget(data.y);
		ctrl.rate.z.setTarget(data.z);
		lastCmdTime = new Date().getTime();
		console.log('SET rotation-speed:', data);
	}
};

app.ws('/socket', function (ws, req) {
	var send = function (msg) {
		ws.send(BSON.serialize(msg));
	};

	ws.on('message', function (data) {
		var msg = BSON.deserialize(data);
		
		if (!handlers[msg.cmd]) {
			send({ type: 'error', msg: 'Invalid command: "'+msg.cmd+'"' });
			return;
		}

		handlers[msg.cmd](msg.opts);
	});

	clients.push(ws); // Add client to list
	ws.on('close', function () { // Remove client from list when disconnected
		clients.splice(clients.indexOf(ws), 1);
	});

	// Send init data
	send(getAppInfo());
	send(getMotorsSpeed());
	send(getOsStats());

	if (!mpu6050) {
		send({ type: 'error', msg: 'MPU6050 not available' });
	}

	send(getOrientation());
});

app.use(express.static(__dirname+'/public'));

var server = app.listen(process.env.PORT || 3000, function () {
	console.log('Server listening', server.address());

	// Periodically broadcast status
	setInterval(function () {
		broadcast(getOsStats());
	}, config.broadcastInterval.osStatus * 1000);

	setInterval(function () {
		broadcast(getOrientation());
		broadcast(getMotorsSpeed());
	}, config.broadcastInterval.orientation * 1000);

	// Start PID loop
	ctrlLoop();
});