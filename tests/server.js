var express = require('express');
var expressWs = require('express-ws');
var runTest = require('./lib/runner')();

var app = express();
expressWs(app); // Enable WebSocket support

app.ws('/socket', function (ws, req) {
	ws.on('message', function (json) {
		var msg = JSON.parse(json);

		var startTime = Date.now();
		runTest(msg).then(function (output) {
			console.log('Test finished after '+(Date.now() - startTime)+'ms');
			ws.send(JSON.stringify(output));
		}, function (err) {
			console.log('WARN: could not run test:', err);
		});
	});
});

var publicDir = __dirname+'/../public';
app.use(express.static(publicDir, { index: 'tests.html' }));

var server = app.listen(process.env.PORT || 3001, function () {
	console.log('Server listening on port ' + server.address().port);
});
