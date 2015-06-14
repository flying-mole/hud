var i2c = require('i2c-bus');
var MPU6050 = require('i2c-mpu6050');

// IMU - Inertial Measurement Unit (here, a MPU6050 is used)
module.exports = function (quad, done) {
	var config = quad.config;

	var i2cDev = i2c.open(config.mpu6050.device, function (err) {
		if (err) return done(err);

		var mpu6050;
		try {
			mpu6050 = new MPU6050(i2cDev, parseInt(config.mpu6050.address));
		} catch (err) {
			done(err);
			return;
		}

		done(null, {
			mpu6050: mpu6050
		});
	});
};