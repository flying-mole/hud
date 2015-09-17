'use strict';

var servoblaster = require('servoblaster');

module.exports = function (quad) {
	return new Promise(function (resolve, reject) {
		var motors = servoblaster.createWriteStream();

		motors.on('open', function () {
			resolve(motors);
		});
		motors.on('error', function (err) {
			reject(err);
		});
	});
};
