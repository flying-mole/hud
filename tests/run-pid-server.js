var express = require('express');
var expressWs = require('express-ws');
var browserify = require('express-browserify-lite');
var MockQuadcopter = require('./mock-quadcopter');
var Model = require('./model');
var config = require('../config');

config.debug = false;

var model = new Model(config);
var quad = new MockQuadcopter(config, model);

function run(timeout) {
	var output = { t: [], x: [] };

	return quad.start().then(function () {
		return new Promise(function (resolve, reject) {
			quad.on('stabilize', function () {
				if (!quad.enabled) return;

				var t = model.t;
				var orientation = quad.orientation;
				var x = orientation.rotation.x;

				//console.log(quad.motorsSpeed, quad.motorsForces, quad.orientation.rotation);

				output.t.push(t);
				output.x.push(x);

				if (t > timeout || Math.abs(x) > 360) {
					quad.enabled = false;
					quad.stop();
					quad.removeAllListeners('stabilize');
					model.reset();

					resolve(output);
				}
			});

			// Start the quad
			quad.enabled = true;
			quad.power = 0.5;
		});
	});
}

var app = express();
expressWs(app); // Enable WebSocket support

var publicDir = __dirname+'/../public';

// DEV ONLY
app.get('/assets/tests.js', browserify({
	entrySourcePath: publicDir+'/js/tests.js'
}));

app.ws('/socket', function (ws, req) {
	ws.on('message', function (json) {
		var msg = JSON.parse(json);

		// Set quad config
		config.controller.updater = msg.updater;
		config.controller.pid.stabilize.x = msg.pid.stabilize;
		config.controller.pid.rate.x = msg.pid.rate;
		quad.config = config;

		quad.ctrl.setTarget({ x: msg.target, y: 0, z: 0 });

		var startTime = Date.now();
		run(msg.timeout).then(function (output) {
			console.log('Test finished after '+(Date.now() - startTime)+'ms');
			ws.send(JSON.stringify(output));
		}, function (err) {
			console.log('WARN: could not run test:', err);
		});
	});
});

app.use(express.static(publicDir, { index: 'tests.html' }));

var server = app.listen(process.env.PORT || 3001, function () {
	console.log('Server listening on port ' + server.address().port);
});
