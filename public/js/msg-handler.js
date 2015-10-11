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
	features: function (msg) {
		this.quad._props.features = msg.features;
		this.quad.emit('features', {
			hardware: msg.hardware,
			updaters: msg.updaters
		});
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
	'motors-forces': function (msg) {
		this.quad._props.motorsForces = msg.forces;
		this.quad.emit('motors-forces', msg.forces);
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
