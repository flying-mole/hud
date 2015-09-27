var fs = require('fs');
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var extend = require('extend');
var runnerFactory = require('./lib/runner');

var pidRanges = {
	stabilize: [
		{
			from: 1,// 0.1,
			to: 20,
			next: function (k) { return k * 1.2; }
			//next: function (k) { return k + 0.1; }
		},
		{
			from: 0.05,
			to: 1,
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
var target = 10; // Step
var removeTimeouts = true;
var updater = 'stabilize-simple';

var options = {
	updater: updater,
	target: target,
	timeout: timeout,
	pid: {
		stabilize: [0, 0, 0],
		rate: [0, 0, 0]
	}
};

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

function resetPidValue(i, type) {
	options.pid[type || pidType][i] = pidRanges[type || pidType][i].from;
}
function resetAllPidValues(type) {
	[0, 1, 2].forEach(function (i) {
		resetPidValue(i, type);
	});
}
function nextPidValue(i, type) {
	if (options.pid[type || pidType][i] >= pidRanges[type || pidType][i].to) {
		return false;
	}

	options.pid[type || pidType][i] = pidRanges[type || pidType][i].next(options.pid[type || pidType][i]);
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

function nextPid() {
	if (!nextAllPidValues()) {
		resetAllPidValues();
		nextPidType();

		if (!nextAllPidValues()) {
			return false;
		}

		resetPidType();
	}
	return true;
}

// Progress
function getPidValueProgress(i, type) {
	var dist = pidRanges[type][i].to - pidRanges[type][i].from;
	if (dist == 0) return 1;
	return (options.pid[type || pidType][i] - pidRanges[type][i].from) / dist;
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
var testsDone = 0;
var lastProgressTime = Date.now();
var lastTestsDone = 0;

var results = [];
var output = [];

var isFirst = true;

if (cluster.isMaster) {
	console.log('Starting master process '+process.pid+'...');

	console.log('Sharing work between workers...');
	var values = [];
	values.push(pidRanges.stabilize[0].from);
	while (nextPidValue(0, 'stabilize')) {
		values.push(options.pid.stabilize[0]);
	}

	var shares = [];
	var stepsPerWorker = Math.floor(values.length / numCPUs);
	for (var i = 0; i < numCPUs; i++) {
		shares.push({
			from: values[stepsPerWorker * i],
			to: values[stepsPerWorker * (i + 1)]
		});
	}
	shares[numCPUs - 1].to = pidRanges.stabilize[0].to; // Little correction

	var done = function () {
		for (var id in cluster.workers) {
			var worker = cluster.workers[id];
			worker.kill();
		}
	};

	var fork = function (i) {
		var worker = cluster.fork();

		worker.on('message', function (result) {
			if (!result.success) {
				console.warn('WARN: worker returned error', result.error);
			} else {
				var respTime = result.responseTime;
				var pid = result.pid;

				if (!removeTimeouts || (respTime !== null && respTime < timeout)) {
					results.push({
						pid: pid,
						responseTime: respTime
					});
				}

				testsDone++;
				lastTestsDone++;

				if (Date.now() - lastProgressTime > 1000) {
					console.log('Avg: '+lastTestsDone / ((Date.now() - lastProgressTime) / 1000)+' tests/s (workers: '+Object.keys(cluster.workers).length+'/'+numCPUs+')');
				
					lastProgressTime = Date.now();
					lastTestsDone = 0;
				}
			}
		});

		// Start sending messages to worker when it's ready
		worker.on('online', function () {
			console.log('Worker ' + worker.process.pid + ' started.');
			worker.send(shares[i]); // Start working
		});

		return worker;
	};

	console.log('Starting workers...');
	for (var i = 0; i < numCPUs; i++) {
		fork(i);
	}

	cluster.on('exit', function (worker, code, signal) {
		console.log('Worker ' + worker.process.pid + ' died.');

		var aliveWorkers = Object.keys(cluster.workers).length;
		if (aliveWorkers == 0) {
			console.log('Finished!');
			console.log('Avg:', testsDone / ((Date.now() - startTime) / 1000), 'tests/s');

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
		}
	});
} else {
	var run = runnerFactory();

	// Is value in 5% of target?
	function targetReached(x) {
		return (Math.abs(x - target) / target < 0.05);
	}

	process.on('message', function (share) {
		pidRanges.stabilize[0].from = share.from;
		pidRanges.stabilize[0].to = share.to;

		function next() {
			// Update PID values
			if (!isFirst && !nextPid()) {
				process.exit();
				return;
			}
			isFirst = false;

			run(options).then(function (output) {
				var respTime = null;
				for (var i = output.t.length - 1; i >= 0; i--) {
					var t = output.t[i],
						x = output.x[i];

					if (!targetReached(x)) {
						if (i < output.t.length - 1) {
							respTime = t;
						}
						break;
					}
				}
				//console.log('Finished:', 'respTime='+respTime);

				process.send({
					success: true,
					pid: options.pid,
					responseTime: respTime
				});
			}, function (err) {
				process.send({
					success: false,
					error: err
				});
			}).then(function () {
				next();
			});
		}

		next();
	});
}
