'use strict';

var PidController = require('node-pid-controller');
var BaseUpdater = require('./base');

var forEachPid = Symbol();

/**
 * A simple stabilize updater.
 * Tries to adjust the angular position from both gyro and accel data.
 */
class StabilizeSimpleUpdater extends BaseUpdater {
	get name() {
		return 'stabilize-simple';
	}

	set config(config) {
		var that = this;

		if (!this.pids) {
			this.pids = {};
		}

		this[forEachPid](function (pid, type, axis) {
			// Get k_p, k_i & k_d from config
			var cst = config[type];

			if (!pid) {
				// Create PID if it doesn't exist
				pid = new PidController({
					k_p: cst[0],
					k_i: cst[1],
					k_d: cst[2],
					dt: true,
					i_max: cst[3] || 0
				});
				pid.setTarget(0);
				that.pids[type][axis] = pid;
			} else {
				// Update PID constants
				pid.k_p = cst[0];
				pid.k_i = cst[1];
				pid.k_d = cst[2];
				pid.i_max = cst[3] || 0;

				// Reset PID
				pid.reset();
			}
		});
	}

	/**
	 * Repeat an action on each PID.
	 * @param {Function} step
	 */
	[forEachPid](step) {
		var pids = this.pids;

		['rate', 'stabilize'].forEach(function (type) {
			if (!pids[type]) pids[type] = {};

			['x', 'y', 'z'].forEach(function (axis) {
				step(pids[type][axis], type, axis);
			});
		});
	}

	reset() {
		// Reset each PID
		this[forEachPid](function (pid) {
			pid.setTarget(0);
			pid.reset();
		});
	}

	setTarget(target) {
		// Set stabilize PIDs values
		for (var axis in target) {
			var t = target[axis];

			this.pids.stabilize[axis].setTarget(t);
		}

		// Reset all PIDs
		this[forEachPid](function (pid) {
			pid.reset();
		});
	}

	update(data) {
		// Apply stabilize PIDs
		var stabilize = {
			x: this.pids.stabilize.x.update(data.rotation.x),
			y: this.pids.stabilize.y.update(data.rotation.y)
		};

		// TODO: z axis

		// Apply rate PIDs
		// Target on rate PIDs is always set to 0
		// To mimick setTarget() behaviour, we directly
		// substract the target to the measure.
		return {
			x: this.pids.rate.x.update(data.gyro.x - stabilize.x),
			y: this.pids.rate.y.update(data.gyro.y - stabilize.y),
			z: this.pids.rate.z.update(data.gyro.z)
		};
	}
}

module.exports = StabilizeSimpleUpdater;
