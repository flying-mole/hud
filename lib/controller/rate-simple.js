/**
 * A simple rate updater.
 * Tries to adjust the rate (ie. angular speed) from gyro data.
 */

module.exports = function (quad, ctrl) {
	return function (data) {
		return {
			x: ctrl.rate.x.update(data.gyro.x),
			y: ctrl.rate.y.update(data.gyro.y),
			z: ctrl.rate.z.update(data.gyro.z)
		};
	};
};