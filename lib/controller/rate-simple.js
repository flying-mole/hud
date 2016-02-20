'use strict';

var PidController = require('node-pid-controller');
var BaseUpdater = require('./_base');

/**
 * A simple rate updater.
 * Tries to adjust the rate (ie. angular speed) from gyro data.
 */
class RateSimpleUpdater extends BaseUpdater {
	constructor(quad) {
		super(quad);

		var cst = this.config.rate;

		var pids = {};
		['x', 'y', 'z'].forEach(function (axis) {
			var ctrl = new PidController({
				k_p: cst[0],
				k_i: cst[1],
				k_d: cst[2],
				dt: true,
				i_max: cst[3] || 0
			});
			ctrl.setTarget(0);
			pids[axis] = ctrl;
		});
		this.pids = pids;

		// TODO: update PID constants on config update
	}

	get name() {
		return 'rate-simple';
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
