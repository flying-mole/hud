var util = require('util');
var EventEmitter = require('events').EventEmitter;
var msgpack = msgpack5(); // TODO: load dependency via browserify

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

	this.emit('connecting');

	var ws = new WebSocket('ws://'+window.location.host+'/socket');
	ws.binaryType = 'arraybuffer';

	ws.addEventListener('open', function () {
		cb(null);
		that.emit('connected');
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
		var msg = msgpack.decode(new Uint8Array(event.data));
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
	this.socket.send(msgpack.encode({
		cmd: cmd,
		opts: opts
	}));
};

module.exports = Client;
