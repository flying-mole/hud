/**
 * A simple rate updater.
 * Tries to adjust the rate (ie. angular speed) from gyro data.
 */

var PidController = require('node-pid-controller');

module.exports = function (quad, ctrl) {
	var config = quad.config;

	var pids = {};
	['x', 'y', 'z'].forEach(function (axis) {
		var cst = config.pid.values.rate[axis];
		var ctrl = new PidController(cst[0], cst[1], cst[2], true);
		ctrl.setTarget(0);
		pids[axis] = ctrl;
	});

	ctrl.on('reset', function () {
		for (var axis in pids) {
			var pid = pids[axis];
			pid.setTarget(0);
			pid.reset();
		}
	});

	ctrl.on('target', function (target) {
		for (var axis in target) {
			var t = target[axis];

			pids[axis].setTarget(t);
		}
	});

	return function (data) {
		return {
			x: pids.x.update(data.gyro.x),
			y: pids.y.update(data.gyro.y),
			z: pids.z.update(data.gyro.z)
		};
	};
};