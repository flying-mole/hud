var util = require('util');
var EventEmitter = require('events').EventEmitter;

function Client() {
	EventEmitter.call(this);
}
util.inherits(Client, EventEmitter);

Client.prototype.connect = function (cb) {
	if (this.socket) { // Already conected
		return;
	}

	if (!cb) cb = function () {};
	var that = this;

	var ws = new WebSocket('ws://'+window.location.host+'/socket');
	ws.binaryType = 'arraybuffer';

	ws.addEventListener('open', function () {
		cb(null);
		that.emit('connect');
	});

	ws.addEventListener('error', function (event) {
		cb(error);
		that.emit('error', error);
	});

	ws.addEventListener('close', function () {
		that.socket = null;
		that.emit('disconnect');
	});

	ws.addEventListener('message', function (event) {
		var msg = BSON.deserialize(new Uint8Array(event.data));
		that.emit('message', msg);
	});

	this.socket = ws;
};

Client.prototype.disconnect = function () {
	if (!this.socket) { // Not conected
		return;
	}

	this.socket.close();
};

Client.prototype.send = function (cmd, opts) {
	this.socket.send(BSON.serialize({
		cmd: cmd,
		opts: opts
	}));
};

module.exports = Client;