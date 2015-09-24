$(function () {
	var chart = c3.generate({
		bindto: '#chart',
		//interaction: { enabled: false },
		point: { show: false },
		data: {
			x: 't',
			columns: []
		}
	});

	var ws = new WebSocket('ws://'+window.location.host+'/socket');

	ws.onopen = function () {
		console.log('Socket opened');
	};
	ws.onclose = function () {
		console.log('Socket closed');
	};

	ws.onmessage = function (event) {
		var json = event.data,
			output = JSON.parse(json);

		console.log(output);

		chart.load({
			columns: [
				['t'].concat(output.t),
				['x'].concat(output.x)
			],
			unload: true
		});
		//chartData.labels = output.t;
	};

	$('#run-pid-form').submit(function (event) {
		event.preventDefault();

		var data = $(this).serializeObject();

		var getPid = function (type) {
			var pid = [];

			for (var i = 0; i < 3; i++) {
				pid.push(parseFloat(data['pid.'+type+'.'+i]) || 0);
			}

			return pid;
		};

		var msg = {
			updater: data.updater,
			target: parseFloat(data.target),
			timeout: parseFloat(data.timeout) * 1000,
			pid: {
				stabilize: getPid('stabilize'),
				rate: getPid('rate')
			}
		};

		ws.send(JSON.stringify(msg));
	});
});
