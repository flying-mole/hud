'use strict';

var hg = require('mercury');
var h = require('mercury').h;

function Alerts(quad) {
	var state = hg.state({
		alerts: hg.array([])
	});

	function add(alert) {
		return Alerts.add(state, alert);
	}

	quad.client.on('disconnect', function () {
		add({ type: 'danger', msg: 'Connection to server lost.' });
	});

	quad.client.on('connecting', function () {
		var remove = add({ type: 'info', msg: 'Connecting to server...' });
		quad.client.once('connected', remove);
	});

	return state;
}

Alerts.add = function (state, alert) {
	var index = state.alerts().length;
	state.alerts.push(alert);

	return function () {
		var alerts = state.alerts();
		for (var i = 0; i < alerts.length; i++) {
			if (alerts[i] === alert) {
				state.alerts.splice(i, 1);
				return;
			}
		}
	};
};

Alerts.render = function (state) {
	return h('#alert-ctn', state.alerts.map(function (alert) {
		return h('.alert.alert-' + alert.type, alert.msg);
	}));
};

module.exports = Alerts;
