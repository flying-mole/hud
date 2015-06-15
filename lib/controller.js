var PidController = require('node-pid-controller');

function Controller(quad) {
	this.quad = quad;

	var config = quad.config;

	var ctrlTypes = ['rate', 'stabilize'];
	var ctrlAxis = ['x', 'y', 'z'];
	var that = this;
	ctrlTypes.forEach(function (type) {
		that[type] = {};
		ctrlAxis.forEach(function (axis) {
			var cst = config.pid.values[type][axis];
			var ctrl = new PidController(cst[0], cst[1], cst[2], true);
			ctrl.setTarget(0);
			that[type][axis] = ctrl;
		});
	});
}

module.exports = Controller;