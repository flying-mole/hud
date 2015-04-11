var util = require('util');
var events = require('events');
var bson = require('bson');
var express = require('express');
var expressWs = require('express-ws');
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
		conn.send(msgBuilder.osStats());
		conn.send(msgBuilder.config());
		conn.send(msgBuilder.power());

		if (!quad.sensors.mpu6050) {
			conn.send(msgBuilder.error('MPU6050 not available'));
		}

		conn.send(msgBuilder.orientation());
	});

	app.use(express.static(__dirname+'/public'));
}

Server.prototype.broadcast = function (msg) {
	this.clients.forEach(function (conn) {
		try {
			conn.send(msg);
		} catch (err) {
			console.error('Cannot broadcast message:', err);
		}
	});
};

Server.prototype.listen = function (done) {
	if (!done) done = function () {};

	var that = this;
	var config = this.quad.config;
	var msgBuilder = this.msgBuilder;

	var server = this.app.listen(process.env.PORT || 3000, function () {
		console.log('Server listening', server.address());

		// Periodically broadcast status
		setInterval(function () {
			that.broadcast(msgBuilder.osStats());
		}, config.broadcastInterval.osStatus * 1000);

		setInterval(function () {
			that.broadcast(msgBuilder.orientation());
			that.broadcast(msgBuilder.motorsSpeed());
		}, config.broadcastInterval.orientation * 1000);

		done();
	});

	this.server = server;
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
	if (msg instanceof Buffer) {
		throw new Error('Invalid data');
	}
	this.ws.send(BSON.serialize(msg));
};

module.exports = Server;