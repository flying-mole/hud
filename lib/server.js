var util = require('util');
var events = require('events');
var bson = require('bson');
var express = require('express');
var expressWs = require('express-ws');
var browserify = require('connect-browserify');
var MsgBuilder = require('./msg-builder');
var MsgHandler = require('./msg-handler');

var BSON = bson.BSONPure.BSON;

function Server(quad) {
	var that = this;

	this.quad = quad;

	var msgBuilder = new MsgBuilder(quad);
	var msgHandler = new MsgHandler(quad);
	this.msgBuilder = msgBuilder;
	this.msgHandler = msgHandler;

	var app = express();
	expressWs(app); // Enable WebSocket support
	this.app = app;

	this.clients = [];

	app.ws('/socket', function (ws, req) {
		var conn = new Connection(ws);

		var send = function (msg) {
			ws.send(BSON.serialize(msg));
		};

		conn.on('message', function (msg) {
			var res = msgHandler.handle(msg);

			if (res) {
				conn.send(res);
			}
		});

		that.clients.push(conn); // Add client to list

		conn.on('close', function () { // Remove client from list when disconnected
			that.clients.splice(that.clients.indexOf(conn), 1);
		});

		// Send init data
		conn.send(msgBuilder.enabled());
		conn.send(msgBuilder.appInfo());
		conn.send(msgBuilder.motorsSpeed());
		conn.send(msgBuilder.motorsForces());
		conn.send(msgBuilder.osStats());
		conn.send(msgBuilder.config());
		conn.send(msgBuilder.power());
		conn.send(msgBuilder.orientation());
	});

	app.get('/camera', function (req, res) {
		if (!quad.camera.enabled) {
			return res.status(503).send('503 Service Unavailable');
		}

		res.type('video/h264');
		quad.camera.stream.pipe(res);
	});

	app.ws('/camera/socket', function (ws, req) {
		if (!quad.camera.enabled) {
			return ws.close();
		}

		var playing = true;
		quad.camera.stream.on('data', function (data) {
			if (!playing) return;

			try {
				ws.send(data);
			} catch (err) {
				console.error('Error sending camera data through websocket:', err);
			}
		});
		quad.camera.stream.on('end', function () {
			ws.close();
		});

		ws.on('message', function (msg) {
			msg = msg.toString();
			if (msg == 'play') {
				playing = true;
			}
			if (msg == 'pause') {
				playing = false;
			}
		});
		ws.on('close', function () {
			playing = false;
		});
	});

	var publicDir = __dirname+'/../public';

	// DEV ONLY
	app.use('/assets/main.js', browserify({
		entry: publicDir+'/js/index.js',
		onError: function (err) {
			console.warn(err);
		},
		debug: false // True to enable source maps
	}));

	app.use(express.static(publicDir));

	// Listen for quadcopter events
	quad.on('enabled', function () {
		that.broadcast(msgBuilder.enabled());
	});
	quad.on('power', function () {
		that.broadcast(msgBuilder.power());
	});
}

Server.prototype.broadcast = function (msg) {
	this.clients.forEach(function (conn) {
		try {
			conn.send(msg);
		} catch (err) {
			console.error('Cannot broadcast message to client:', err);
		}
	});
};

Server.prototype.listen = function (done) {
	if (!done) done = function () {};

	var that = this;

	var server = this.app.listen(process.env.PORT || this.quad.config.server.port, function () {
		console.log('Server listening on port ' + server.address().port);

		// Periodically broadcast status
		that._setInterval();

		done();
	});

	this.server = server;
};

Server.prototype._setInterval = function () {
	var that = this;
	var config = this.quad.config;
	var msgBuilder = this.msgBuilder;

	if (that._osStatusInterval) clearInterval(that._osStatusInterval);
	if (that._orientationInterval) clearInterval(that._orientationInterval);

	that._osStatusInterval = setInterval(function () {
		that.broadcast(msgBuilder.osStats());
	}, config.broadcastInterval.osStatus * 1000);

	that._orientationInterval = setInterval(function () {
		that.broadcast(msgBuilder.orientation());
		that.broadcast(msgBuilder.motorsSpeed());
		that.broadcast(msgBuilder.motorsForces());
	}, config.broadcastInterval.orientation * 1000);
};

function Connection(ws) {
	events.EventEmitter.call(this);

	var that = this;
	this.ws = ws;

	ws.on('message', function (data) {
		that.emit('message', BSON.deserialize(data));
	});
	ws.on('close', function () {
		that.emit('close');
	});
}

util.inherits(Connection, events.EventEmitter);

Connection.prototype.send = function (msg) {
	//console.log('SEND', msg);
	if (msg instanceof Array) {
		var that = this;
		msg.forEach(function (item) {
			that.send(item);
		});
		return;
	}
	if (msg instanceof Buffer) {
		throw new Error('Invalid data');
	}
	this.ws.send(BSON.serialize(msg));
};

module.exports = Server;