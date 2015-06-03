var os = require('os');
var pkg = require('../package.json');

function MsgBuilder(quad) {
	this.quad = quad;
}

MsgBuilder.prototype = {
	appInfo: function () {
		return {
			type: 'info',
			msg: 'Flying Mole '+pkg.version+' - welcome dear mole!'
		};
	},
	enabled: function () {
		return {
			type: 'enabled',
			enabled: this.quad.enabled
		};
	},
	power: function () {
		return {
			type: 'power',
			power: this.quad.power
		};
	},
	osStats: function () {
		return {
			type: 'os-stats',
			loadavg: os.loadavg(),
			mem: {
				total: os.totalmem(),
				free: os.freemem()
			}
		};
	},
	config: function () {
		return {
			type: 'config',
			config: this.quad.config
		};
	},
	orientation: function () {
		return {
			type: 'orientation',
			data: this.quad.orientation || {
				gyro: { x: 0, y: 0, z: 0 },
				accel: { x: 0, y: 0, z: 0 },
				rotation: { x: 0, y: 0 },
				temp: 0
			}
		};
	},
	motorsSpeed: function () {
		return {
			type: 'motors-speed',
			speed: this.quad.motorsSpeed || [0, 0, 0, 0]
		};
	},
	error: function (msg) {
		return {
			type: 'error',
			msg: msg
		};
	}
};

module.exports = MsgBuilder;