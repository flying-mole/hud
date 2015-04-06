var os = require('os');
var bson = require('bson');
var express = require('express');
var servoblaster = require('servoblaster');

var BSON = bson.BSONPure.BSON;
var app = express();
var expressWs = require('express-ws')(app);

var servo = servoblaster.createWriteStream();

var clients = [];
function broadcast(msg) {
	clients.forEach(function (ws) {
		ws.send(BSON.serialize(msg));
	});
}

function broadcastOsStats() {
	broadcast({
		type: 'os-stats',
		loadavg: os.loadavg(),
		mem: {
			total: os.totalmem(),
			free: os.freemem()
		}
	});
}

var handlers = {
	power: function (val) {
		val = Math.round(val * 200);
		console.log('Power: '+val);
		servo.write({ pin: 0, value: val });

		broadcast({
			type: 'motors-speed',
			speed: [val/200, 0, 0, 0]
		});
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

	ws.on('close', function () {
		clients.splice(clients.indexOf(ws), 1);
	});
	clients.push(ws);

	// Send init data

	send({
		type: 'info',
		msg: 'Flying Mole 0.1.0 - welcome dear mole!'
	});

	send({
		type: 'motors-speed',
		speed: [0, 0, 0, 0]
	});

	send({
		type: 'orientation',
		alpha: 0, // compass direction the device is facing in degrees
		beta: 0, // front-to-back tilt in degrees, where front is positive
		gamma: 0 // left-to-right tilt in degrees, where right is positive
	});

	broadcastOsStats();
});

app.use(express.static(__dirname+'/public'));

var server = app.listen(process.env.PORT || 3000, function () {
	console.log('Server listening', server.address());
});