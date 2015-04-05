var bson = require('bson');
var express = require('express');
var servoblaster = require('servoblaster');

var BSON = bson.BSONPure.BSON;
var app = express();
var expressWs = require('express-ws')(app);

var servo = servoblaster.createWriteStream();

var handlers = {
	power: function (val) {
		val = Math.round(val * 200);
		console.log('Power: '+val);
		servo.write({ pin: 0, value: val });
	}
};

app.ws('/socket', function (ws, req) {
	var sendMsg = function (msg) {
		ws.send(BSON.serialize(msg));
	};

	ws.on('message', function (data) {
		var msg = BSON.deserialize(data);
		
		if (!handlers[msg.cmd]) {
			sendMsg({ type: 'error', msg: 'Invalid command: "'+msg.cmd+'"' });
			return;
		}

		handlers[msg.cmd](msg.opts);
	});
});

app.use(express.static(__dirname+'/public'));

var server = app.listen(process.env.PORT || 3000, function () {
	console.log('Server listening', server.address());
});