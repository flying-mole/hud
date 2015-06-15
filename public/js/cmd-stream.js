var util = require('util');
var EventEmitter = require('events').EventEmitter;

function CmdStream(client) {
	EventEmitter.call(this);

	this.client = client;
}
util.inherits(CmdStream, EventEmitter);

CmdStream.prototype.send = function (cmd, opts) {
	this.emit(cmd, opts);
	this.client.send(cmd, opts);
};

module.exports = CmdStream;