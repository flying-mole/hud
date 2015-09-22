var fs = require('fs');
var extend = require('extend');
var MockQuadcopter = require('./mock-quadcopter');
var Model = require('./model');
var config = require('../config');

var pidRanges = {
	stabilize: [
		{
			from: 1,// 0.1,
			to: 20,
			next: function (k) { return k * 1.2; }
			//next: function (k) { return k + 0.1; }
		},
		{
			from: 0.01,
			to: 0.1,
			next: function (k) { return k * 1.2; }
			//next: function (k) { return k + 0.01; }
		},
		{
			from: 0, //0.01,
			to: 0, //0.1,
			next: function (k) { return k * 1.2; }
		}
	],
	rate: [
		{
			from: 0.001,
			to: 0.1,
			next: function (k) { return k * 1.2; }
			//next: function (k) { return k + 0.1; }
		},
		{
			from: 0,
			to: 0,
			next: function (k) { return k * 1.2; }
			//next: function (k) { return k + 0.01; }
		},
		{
			from: 0,
			to: 0,
			next: function (k) { return k * 1.2; }
		}
	]
};
var timeout = 30 * 1000; // in ms
var target = { x: 10, y: 0, z: 0 }; // Step
var removeTimeouts = true;

var pidType;
function resetPidType() {
	pidType = 'stabilize';
}
function nextPidType() {
	if (pidType == 'stabilize') {
		pidType = 'rate';
		return true;
	} else {
		return false;
	}
}
resetPidType();

// Set quad config
config.debug = false;
config.controller.updater = 'stabilize-simple';

function resetPidValue(i, type) {
	config.controller.pid[type || pidType].x[i] = pidRanges[type || pidType][i].from;
}
function resetAllPidValues(type) {
	[0, 1, 2].forEach(function (i) {
		resetPidValue(i, type);
	});
}
function nextPidValue(i) {
	if (config.controller.pid[pidType].x[i] >= pidRanges[pidType][i].to) {
		return false;
	}

	config.controller.pid[pidType].x[i] = pidRanges[pidType][i].next(config.controller.pid[pidType].x[i]);
	return true;
}
function nextAllPidValues() {
	var i = 0;
	while (!nextPidValue(i)) {
		resetPidValue(i);

		i++;

		if (i >= 3) { // All PID values tested
			return false;
		}
	}
	return true;
}

resetAllPidValues('stabilize');
resetAllPidValues('rate');

// Progress
function getPidValueProgress(i, type) {
	var dist = pidRanges[type][i].to - pidRanges[type][i].from;
	if (dist == 0) return 1;
	return (config.controller.pid[type || pidType].x[i] - pidRanges[type][i].from) / dist;
}
function getProgress() {
	var progress = 0;
	for (var i = 0; i < 3; i++) {
		progress += getPidValueProgress(i, 'stabilize') / (10000 * i);
	}
	for (var i = 0; i < 3; i++) {
		progress += getPidValueProgress(i, 'rate') / (10000 * (i + 3));
	}
	progress /= 8;
	return Math.round(progress * 10000) / 10000;
}

var startTime = Date.now();

var model = new Model(config);
var quad = new MockQuadcopter(config, model);

var results = [];
var output = [];
var progress = 0;

quad.start().then(function () {
	quad.on('stabilize', function () {
		if (!quad.enabled) return;

		var t = model.t;
		var orientation = quad.orientation;
		var x = orientation.rotation.x;

		//console.log(quad.motorsSpeed, quad.motorsForces, quad.orientation.rotation);

		output.push({
			t: t,
			x: x
		});

		if (t > timeout) {
			// Is value in 5% of target?
			function targetReached(x) {
				return (Math.abs(x - target.x) / target.x < 0.05);
			}

			var respTime = 0;
			for (var i = output.length - 1; i >= 0; i--) {
				var item = output[i];

				if (!targetReached(item.x)) {
					respTime = item.t;
					break;
				}
			}
			output = [];

			//console.log('Finished:', 'respTime='+respTime);

			if (!removeTimeouts || respTime < t) {
				results.push({
					pid: {
						rate: extend(true, [], config.controller.pid.rate.x),
						stabilize: extend(true, [], config.controller.pid.stabilize.x)
					},
					responseTime: respTime
				});
			}

			quad.enabled = false;
			model.reset();

			// Update PID values
			if (!nextAllPidValues()) {
				resetAllPidValues();
				nextPidType();

				if (!nextAllPidValues()) {
					quad.stop();

					console.log('Finished!');
					console.log('Generating output file...');

					var csv = 'stabilize_p,stabilize_i,stabilize_d,rate_p,rate_i,rate_d,responseTime\n';
					results.forEach(function (item) {
						csv += item.pid.stabilize.join(',')+','+item.pid.rate.join(',')+','+item.responseTime+'\n';
					});

					console.log('Writing file...', csv.length, 'bytes');
					fs.writeFile('output.csv', csv, function (err) {
						if (err) console.log(err);

						/*console.log(results.sort(function (a, b) {
							return a.responseTime - b.responseTime;
						}).splice(0, 20));*/

						console.log('Done after '+Math.round((Date.now() - startTime) / 1000)+'s');

						process.exit();
					});
					return;
				}

				resetPidType();
			}

			// Progress
			var newProgress = getProgress();
			if (progress != newProgress) {
				progress = newProgress;
				console.log('Progress:', getPidValueProgress(2, 'rate'), getPidValueProgress(1, 'rate'), getPidValueProgress(0, 'rate'), getPidValueProgress(2, 'stabilize'), getPidValueProgress(1, 'stabilize'), getPidValueProgress(0, 'stabilize'));
			}

			quad.config = config;
			next();
		}
	});

	function next() {
		//console.log('Testing PID:', quad.config.controller.pid[pidType].x);

		// Start the quad
		quad.ctrl.setTarget(target);
		quad.enabled = true;
		quad.power = 0.5;
	}

	next();

	// TODO: trigger a disruption on model
	// TODO: spy on orientation to see the result
}, function (err) {
	console.error('Cannot start quad.', err);
	process.exit(1);
});
