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
var xVal = config.pid.values.x,
	yVal = config.pid.values.y;
var ctrl = {
	x: new PidController(xVal[0], xVal[1], xVal[2]),
	y: new PidController(yVal[0], yVal[1], yVal[2])
};

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

var orientation = null;
function readOrientation(done) {
	if (!mpu6050) {
		return done('MPU6050 not available');
	}

	mpu6050.read(function (err, data) {
		if (err) return done(err);

		orientation = data;

		// Corrections
		var x = ctrl.x.update(data.rotation.x);
		var y = ctrl.y.update(data.rotation.y);
		
		// TODO: update servos
		console.log('UPDATE orientation', x, y);

		done(null);
	});
}

function readOrientationVirtual(done) { // FAKE
	setTimeout(function () {
		var rot = {
			x: ctrl.x.target + Math.random() * 10,
			y: ctrl.y.target + Math.random() * 10
		};

		orientation = { rotation: rot };

		// Corrections
		var x = ctrl.x.update(rot.x);
		var y = ctrl.y.update(rot.y);

		// TODO: update servos
		console.log('UPDATE orientation', x, y);

		done(null);
	}, 20);
}

function ctrlLoop() {
	readOrientationVirtual(function (err) {
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
			rotation: { x: 0, y: 0 }
		}
	};
}

// Command handlers
var handlers = {
	power: function (val) {
		var pwmVal = Math.round(val * 200);
		console.log('SET power:', pwmVal);
		servo.write({ pin: config.servos.pins[0], value: pwmVal });

		broadcast({
			type: 'motors-speed',
			speed: [val, 0, 0, 0]
		});
	},
	orientation: function (data) {
		ctrl.x.setTarget(data.beta);
		ctrl.y.setTarget(data.gamma);
		// TODO: alpha
		//console.log('SET orientation:', data);
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
	send({
		type: 'motors-speed',
		speed: [0, 0, 0, 0]
	});
	send(getOsStats());

	if (!mpu6050) {
		send({ type: 'error', msg: 'MPU6050 not available' });
	}

	send(getOrientation());
});

app.use(express.static(__dirname+'/public'));

var server = app.listen(process.env.PORT || 3000, function () {
	console.log('Server listening', server.address());

	// Init PID
	ctrl.x.setTarget(0);
	ctrl.y.setTarget(0);

	// Periodically broadcast status
	setInterval(function () {
		broadcast(getOsStats());
	}, config.broadcastInterval.osStatus * 1000);

	setInterval(function () {
		broadcast(getOrientation());
	}, config.broadcastInterval.orientation * 1000);

	// Start PID loop
	ctrlLoop();
});