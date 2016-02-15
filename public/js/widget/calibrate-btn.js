'use strict';

var hg = require('mercury');
var h = require('mercury').h;
var extend = require('extend');

function CalibrateBtn(quad) {
	return hg.state({
		channels: {
			calibrate: function (state) {
				var calibration = extend(true, {}, quad.config.mpu6050.calibration);
				var types = ['gyro', 'accel', 'rotation'];
				for (var i = 0; i < types.length; i++) {
					var type = types[i];
					if (!calibration[type]) {
						calibration[type] = { x: 0, y: 0, z: 0 };
					}
					for (var axis in quad.orientation[type]) {
						calibration[type][axis] -= quad.orientation[type][axis];
					}
				}

				// z accel is 1, because of gravitation :-P
				calibration.accel.z += 1;

				quad.config.mpu6050.calibration = calibration;
				quad.cmd.send('config', quad.config);
			}
		}
	});
}

CalibrateBtn.render = function (state) {
	return h('button.btn.btn-default', { 'ev-click': state.channels.calibrate }, 'Calibrate');
};

module.exports = CalibrateBtn;
