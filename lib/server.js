'use strict';

var events = require('events');
var express = require('express');
var expressWs = require('express-ws');
var browserify = require('express-browserify-lite');
var MsgBuilder = require('./msg-builder');
var MsgHandler = require('./msg-handler');
var Connection = require('./connection');

/**
 * The quadcopter server.
 * It is an HTTP web server which will display a user-friendly interface to control the quad.
 * It serves static HTML files and has endpoints for websocket connections.
 */
class Server {
	constructor(quad) {
		var that = this;

		this.quad = quad;

		// Initialize messages components
		// MsgBuilder will build messages which will be sent to the client
		// MsgHandler will handle messages sent by the client
		var msgBuilder = new MsgBuilder(quad);
		var msgHandler = new MsgHandler(quad);
		this.msgBuilder = msgBuilder;
		this.msgHandler = msgHandler;

		// Create the webapp
		var app = express();
		expressWs(app); // Enable WebSocket support
		this.app = app;

		// List of currently connected clients
		this.clients = [];

		// Websocket endpoint
		app.ws('/socket', function (ws, req) {
			// New websocket connection
			var conn = new Connection(ws);

			conn.on('message', function (msg) {
				// Process message from client when one is received
				var res = msgHandler.handle(msg);

				if (res) {
					// If a response is returned, send it
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

		// HTTP stream for camera
		app.get('/camera', function (req, res) {
			if (!quad.camera.enabled) {
				// Camera not enabled
				return res.status(503).send('503 Service Unavailable');
			}

			// Send stream to client
			res.type('video/h264');
			quad.camera.broadcastStream.pipe(res);
		});

		// Websocket endpoint for camera
		app.ws('/camera/socket', function (ws, req) {
			var playing = true;

			var cameraEnabled = function () {
				quad.camera.broadcastStream.on('data', function (data) {
					if (!playing) return;

					try {
						ws.send(data);
					} catch (err) {
						console.error('Error sending camera data through websocket:', err);
					}
				});
				quad.camera.broadcastStream.on('end', function () {
					ws.close();
				});
			};

			if (quad.camera.enabled) {
				cameraEnabled();
			} else {
				quad.camera.on('start', function () {
					cameraEnabled();
				});
			}

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
		// Send client library, and bundle its dependencies
		app.get('/assets/main.js', browserify({
			entrySourcePath: publicDir+'/js/index.js'
		}));

		// Serve static files under public/
		app.use(express.static(publicDir));

		// Listen for quadcopter events
		// Broadcast them to all clients
		quad.on('enabled', function () {
			that.broadcast(msgBuilder.enabled());
		});
		quad.on('power', function () {
			that.broadcast(msgBuilder.power());
		});
		// TODO: other events
	}

	/**
	 * Broadcast a message to all clients.
	 * @param  {Object} msg The message.
	 */
	broadcast(msg) {
		this.clients.forEach(function (conn) {
			try {
				conn.send(msg);
			} catch (err) {
				console.error('Cannot broadcast message to client:', err);
			}
		});
	}

	/**
	 * Start the server.
	 * @return {Promise}
	 */
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

	/**
	 * Stop the server.
	 * @return {Promise}
	 */
	close() {
		var that = this;

		return new Promise(function (resolve, reject) {
			that.server.close(function () {
				resolve();
			});
		});
	}

	/**
	 * Periodically send data to all clients (orientation, cpu load, and so on).
	 * @private
	 */
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
