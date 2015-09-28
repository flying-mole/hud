'use strict';

var EventEmitter = require('events').EventEmitter;
var BSON = require('bson').BSONPure.BSON;

/**
 * A client websocket connection.
 */
class Connection extends EventEmitter {
	constructor(ws) {
		super();

		this.ws = ws;

		var that = this;
		ws.on('message', function (data) {
			that.emit('message', BSON.deserialize(data));
		});
		ws.on('close', function () {
			that.emit('close');
		});
	}

	/**
	 * Send a message to this client.
	 * @param  {Object} msg The message to send.
	 */
	send(msg) {
		if (msg instanceof Array) {
			// Send multiple messages
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
	}
}

module.exports = Connection;
