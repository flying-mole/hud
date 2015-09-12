'use strict';

var PidController = require('node-pid-controller');
var BaseUpdater = require('./base');

/**
 * A simple rate updater.
 * Tries to adjust the rate (ie. angular speed) from gyro data.
 */
class RateSimpleUpdater extends BaseUpdater {
	constructor(quad) {
		super(quad);

		var pids = {};
		['x', 'y', 'z'].forEach(function (axis) {
			var cst = quad.config.pid.values.rate[axis];
			var ctrl = new PidController(cst[0], cst[1], cst[2], true);
			ctrl.setTarget(0);
			pids[axis] = ctrl;
		});
		this.pids = pids;
	}

	reset() {
		for (var axis in this.pids) {
			var pid = this.pids[axis];
			pid.setTarget(0);
			pid.reset();
		}
	}

	setTarget(target) {
		for (var axis in target) {
			var t = target[axis];

			this.pids[axis].setTarget(t);
		}
	}

	update(data) {
		return {
			x: this.pids.x.update(data.gyro.x),
			y: this.pids.y.update(data.gyro.y),
			z: this.pids.z.update(data.gyro.z)
		};
	}
}

module.exports = RateSimpleUpdater;
