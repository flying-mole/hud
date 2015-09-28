var fs = require('fs');
var mpu6050 = require('mpu6050-dmp');

// IMU - Inertial Measurement Unit (here, a MPU6050 is used)
module.exports = function (quad) {
	var config = quad.config;

	return new Promise(function (resolve, reject) {
		if (!fs.existsSync('/dev/i2c-'+config.mpu6050.device)) {
			return reject('I2C device '+config.mpu6050.device+' doesn\'t exist');
		}

		if (!mpu6050.initialize()) {
			return reject();
		}

		// TODO: Listen to config changes to calibrate sensors
		/*quad.on('config', function (config) {
			var cal = config.mpu6050.calibration;
			if (cal.gyro) mpu6050.calibrateGyro(cal.gyro);
			if (cal.accel) mpu6050.calibrateAccel(cal.accel);
		});*/

		resolve({
			mpu6050: {
				read: function (done) {
					var speed = mpu6050.getRotation(),
						angle = mpu6050.getAttitude();

					done(null, {
						accel: { x: 0, y: 0, z: 0 },
						gyro: { x: speed.yaw, y: speed.pitch, z: speed.roll },
						rotation: { x: angle.pitch, y: -angle.roll, z: angle.yaw },
						temp: 0
					});
				}
			}
		});
	});
};
