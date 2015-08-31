/**
 * A simple stabilize updater.
 * Tries to adjust the angular position from both gyro and accel data.
 */

var PidController = require('node-pid-controller');

function forEachPid(pids, step) {
	if (!pids) pids = {};

	['rate', 'stabilize'].forEach(function (type) {
		if (!pids[type]) pids[type] = {};

		['x', 'y', 'z'].forEach(function (axis) {
			step(pids[type][axis], type, axis);
		});
	});
}

module.exports = function (quad, ctrl) {
	var config = quad.config;
	var pids = {};
	forEachPid(pids, function (pid, type, axis) {
		var cst = config.pid.values[type][axis];
		var ctrl = new PidController(cst[0], cst[1], cst[2], true);
		ctrl.setTarget(0);
		pids[type][axis] = ctrl;
	});

	ctrl.on('reset', function () {
		forEachPid(pids, function (pid) {
			pid.setTarget(0);
			pid.reset();
		});
	});

	return function (data) {
		var stabilize = {
			x: pids.stabilize.x.update(data.rotation.x),
			y: pids.stabilize.y.update(data.rotation.y)
		};

		// TODO: z axis

		return {
			x: pids.rate.x.update(data.gyro.x - stabilize.x),
			y: pids.rate.y.update(data.gyro.y - stabilize.y),
			z: pids.rate.z.update(data.gyro.z)
		};
	};
};