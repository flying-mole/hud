var util = require('util');
var EventEmitter = require('events').EventEmitter;

function CmdStream(socket) {
	EventEmitter.call(this);

	this.socket = socket;
}
util.inherits(CmdStream, EventEmitter);

CmdStream.prototype.write = function (cmd) {
	this.emit('data', cmd);

	this.socket.send(BSON.serialize({
		cmd: cmd,
		opts: opts
	}));
};

module.exports = CmdStream;