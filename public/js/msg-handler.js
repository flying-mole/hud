function MsgHandler(quad) {
	this.quad = quad;
}

MsgHandler.prototype = {
	handle: function (msg) {
		if (!this[msg.type] || msg.type == 'handle') {
			throw new Error('Unsupported message type: "'+msg.type+'"');
		}

		return this[msg.type](msg);
	},
	error: function (msg) {
		this.quad.emit('error', msg.msg);
	},
	info: function (msg) {
		this.quad.emit('info', msg.msg);
	},
	enabled: function (msg) {
		this.quad._props.enabled = msg.enabled;
		this.quad.emit('enabled', msg.enabled);
	},
	power: function (msg) {
		this.quad._props.power = msg.power;
		this.quad.emit('power', msg.power);
	},
	'motors-speed': function (msg) {
		this.quad._props.motorsSpeed = msg.speed;
		this.quad.emit('motors-speed', msg.speed);
	},
	orientation: function (msg) {
		this.quad._props.orientation = msg.data;
		this.quad.emit('orientation', msg.data);
	},
	'os-stats': function (msg) {
		this.quad.emit('os-stats', msg);
	},
	config: function (msg) {
		this.quad._config = msg.config;
		this.quad.emit('config', msg.config);
	}
};

module.exports = MsgHandler;