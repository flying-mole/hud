var i2c = require('i2c-bus');
var MPU6050 = require('i2c-mpu6050');

// IMU - Inertial Measurement Unit (here, a MPU6050 is used)
module.exports = function (quad) {
	var config = quad.config;

	return new Promise(function (resolve, reject) {
		var i2cDev = i2c.open(config.mpu6050.device, function (err) {
			if (err) return reject(err);

			// Initialize MPU6050
			var mpu6050;
			try {
				mpu6050 = new MPU6050(i2cDev, parseInt(config.mpu6050.address));
			} catch (err) {
				return reject(err);
			}

			// Listen to config changes to calibrate sensors
			quad.on('config', function (config) {
				var cal = config.mpu6050.calibration;
				if (cal.gyro) mpu6050.calibrateGyro(cal.gyro);
				if (cal.accel) mpu6050.calibrateAccel(cal.accel);
			});

			resolve({
				mpu6050: mpu6050
			});
		});
	});
};
