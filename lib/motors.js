'use strict';

var servoblaster = require('servoblaster');

/**
 * Load the motors.
 * @param  {Quadcopter} quad The quadcopter.
 * @return {Promise}
 */
module.exports = function (quad) {
	return new Promise(function (resolve, reject) {
		// Create a servoblaster stream
		// Commands for ESCs will be sent using this stream
		var motors = servoblaster.createWriteStream();

		motors.on('open', function () {
			resolve(motors); // Motors ready
		});
		motors.on('error', function (err) {
			reject(err);
		});
	});
};
