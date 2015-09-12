'use strict';

var util = require('util');
var events = require('events');
var express = require('express');
var expressWs = require('express-ws');
var persistify = require('persistify');
var MsgBuilder = require('./msg-builder');
var MsgHandler = require('./msg-handler');
var Connection = require('./connection');

class Server {
	constructor(quad) {
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
			// New client websocket connection
			var conn = new Connection(ws);

			conn.on('message', function (msg) {
				// Process message from client
				var res = msgHandler.handle(msg);

				if (res) {
					conn.send(res);
				}
			});

			that.clients.push(conn); // Add client to list

			conn.on('close', function () {
				// Remove client from list when disconnected
				that.clients.splice(that.clients.indexOf(conn), 1);
			});

			// Send initial data
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
		/*app.use('/assets/main.js', browserify({
			entry: publicDir+'/js/index.js',
			onError: function (err) {
				console.warn(err);
			},
			debug: false // True to enable source maps
		}));*/

		var b = persistify({}, { watch: true });
		b.add(publicDir+'/js/index.js');

		app.use('/assets/main.js', function (req, res) {
			res.type('text/javascript');
			b.bundle().pipe(res);
		});

		app.use(express.static(publicDir));

		// Listen for quadcopter events
		quad.on('enabled', function () {
			that.broadcast(msgBuilder.enabled());
		});
		quad.on('power', function () {
			that.broadcast(msgBuilder.power());
		});
		// TODO: other events
	}

	broadcast(msg) {
		this.clients.forEach(function (conn) {
			try {
				conn.send(msg);
			} catch (err) {
				console.error('Cannot broadcast message to client:', err);
			}
		});
	}

	listen() {
		var that = this;
		
		return new Promise(function (resolve, reject) {
			var server = that.app.listen(process.env.PORT || that.quad.config.server.port, function () {
				console.log('Server listening on port ' + server.address().port);

				// Periodically broadcast status
				that._scheduleStatusBroadcast();

				// Refresh broadcast interval on config change
				that.quad.on('config', function () {
					that._scheduleStatusBroadcast();
				});

				resolve();
			});

			that.server = server;
		});
	}
	
	_scheduleStatusBroadcast() {
		var that = this;
		var config = this.quad.config;
		var msgBuilder = this.msgBuilder;

		if (this._osStatusInterval) clearInterval(this._osStatusInterval);
		if (this._orientationInterval) clearInterval(this._orientationInterval);

		this._osStatusInterval = setInterval(function () {
			that.broadcast(msgBuilder.osStats());
		}, config.broadcastInterval.osStatus * 1000);

		this._orientationInterval = setInterval(function () {
			that.broadcast(msgBuilder.orientation());
			that.broadcast(msgBuilder.motorsSpeed());
			that.broadcast(msgBuilder.motorsForces());
		}, config.broadcastInterval.orientation * 1000);
	}
}

module.exports = Server;
