/**
 * A simple stabilize updater.
 * Tries to adjust the angular position from both gyro and accel data.
 */

module.exports = function (quad, ctrl) {
	return function (data) {
		var stabilize = {
			x: ctrl.stabilize.x.update(data.rotation.x),
			y: ctrl.stabilize.y.update(data.rotation.y)
		};

		return {
			x: ctrl.rate.x.update(data.gyro.x - stabilize.x),
			y: ctrl.rate.y.update(data.gyro.y - stabilize.y),
			z: ctrl.rate.z.update(data.gyro.z)
		};
	};
};