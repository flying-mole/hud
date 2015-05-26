var BSON = bson().BSON;
var ws;

var percentColors = [
	{ pct: 0.0, color: { r: 0xff, g: 0x00, b: 0 } },
	{ pct: 0.5, color: { r: 0xff, g: 0xff, b: 0 } },
	{ pct: 1.0, color: { r: 0x00, g: 0xff, b: 0 } } ];

var getColorForPercentage = function(pct) {
	for (var i = 1; i < percentColors.length - 1; i++) {
		if (pct < percentColors[i].pct) {
			break;
		}
	}
	var lower = percentColors[i - 1];
	var upper = percentColors[i];
	var range = upper.pct - lower.pct;
	var rangePct = (pct - lower.pct) / range;
	var pctLower = 1 - rangePct;
	var pctUpper = rangePct;
	var color = {
		r: Math.floor(lower.color.r * pctLower + upper.color.r * pctUpper),
		g: Math.floor(lower.color.g * pctLower + upper.color.g * pctUpper),
		b: Math.floor(lower.color.b * pctLower + upper.color.b * pctUpper)
	};
	return color;
}

/**
 * @see http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
 */
var shadeColor = function (color, p) {
	var t = (p < 0) ? 0 : 255,
		p = (p < 0) ? p*-1 : p;

	return {
		r: Math.round((t-color.r)*p)+color.r,
		g: Math.round((t-color.g)*p)+color.g,
		b: Math.round((t-color.b)*p)+color.b
	};
};

var colorToRgb = function (color) {
	return 'rgb(' + [color.r, color.g, color.b].join(',') + ')';
};

function Joystick(el, oninput) {
	var that = this;

	this.joystick = $(el);
	this.handle = this.joystick.find('.handle');

	var joystickSize = {
		width: this.joystick.width(),
		height: this.joystick.height()
	};
	var handleSize = {
		width: this.handle.width(),
		height: this.handle.height()
	};

	this.pressed = true;

	var offset;
	this.joystick.on('mousedown mousemove mouseup', function (event) {
		if ((event.type == 'mousemove' && event.buttons) || event.type == 'mousedown') {
			if (!that.pressed) {
				that.joystick.addClass('active');
				that.pressed = true;

				offset = that.joystick.offset();
			}

			var x = event.pageX - offset.left - handleSize.width/2,
				y = event.pageY - offset.top - handleSize.height/2;

			that.handle.css({
				left: x,
				top: y
			});

			// In degrees
			oninput({
				alpha: 0,
				beta: (x - joystickSize.width/2) / joystickSize.width * 90, // front-to-back tilt in degrees, where front is positive
				gamma: (y - joystickSize.height/2) / joystickSize.height * 90 // left-to-right tilt in degrees, where right is positive
			});
		} else {
			if (that.pressed) {
				that.joystick.removeClass('active');
				that.handle.css({
					left: joystickSize.width/2 - handleSize.width/2,
					top: joystickSize.height/2 - handleSize.height/2
				});
				that.pressed = false;

				oninput({
					alpha: 0,
					beta: 0,
					gamma: 0
				});
			}
		}
	});
	this.joystick.trigger('mouseup');
}

function DeviceOrientationJoystick(oninput) {
	if (!DeviceOrientationJoystick.isSupported()) {
		throw new Error('DeviceOrientation not supported');
	}

	window.addEventListener('deviceorientation', function (event) {
		oninput({
			alpha: event.alpha,
			beta: event.beta, // front-to-back tilt in degrees, where front is positive
			gamma: event.gamma // left-to-right tilt in degrees, where right is positive
		});
	}, false);
}
DeviceOrientationJoystick.isSupported = function () {
	return (typeof window.DeviceOrientationEvent != 'undefined');
};

function QuadcopterSchema(svg) {
	this.svg = $(svg);
}
QuadcopterSchema.prototype.setSpeed = function (speed) {
	var propellers = this.svg.find('#propellers > g');

	for (var i = 0; i < speed.length; i++) {
		var s = speed[i];
		var color = shadeColor(getColorForPercentage(1 - s), -0.5);
		$(propellers[i]).css('fill', colorToRgb(color));
	}
};
QuadcopterSchema.prototype.setRotation = function (rot) {
	this.svg.css('transform', 'rotate('+rot+'deg)');
};

function sendCommand(cmd, opts) {
	ws.send(BSON.serialize({
		cmd: cmd,
		opts: opts
	}));
}

(function () {
	/*var createStream = function (ondata) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', '/camera', true);
		xhr.responseType = 'moz-chunked-arraybuffer'; // TODO: works only in Firefox
		xhr.onprogress = function (event) {
			ondata(xhr.response, event.loaded, event.total);
		};
		//xhr.onload = function () {
		//	ondata(xhr.response);
		//};
		xhr.send(null);

		return {
			abort: function () {
				xhr.abort();
			}
		};
	};*/

	var createStream = function (ondata) {
		var ws = new WebSocket('ws://'+window.location.host+'/camera/socket');
		ws.binaryType = 'arraybuffer';

		ws.addEventListener('open', function () {
			log('Camera connection opened.');
		});

		ws.addEventListener('error', function (event) {
			console.error(error);
			log('Camera connection error!', 'error');
		});

		ws.addEventListener('close', function () {
			log('Camera connection closed.');
		});

		ws.addEventListener('message', function (event) {
			ondata(event.data);
		});

		return {
			play: function () {
				ws.send('play');
			},
			pause: function () {
				ws.send('pause');
			},
			abort: function () {
				ws.close();
			}
		};
	};

	var stream, nalDecoder;
	var cameraPreview = {
		start: function () {
			if (cameraPreview.isEnabled()) {
				this.stop();
			}

			var player = new Player({
				useWorker: true,
				workerFile: 'assets/broadway/Decoder.js'
			});

			sendCommand('camera-preview', true);

			nalDecoder = new Worker('assets/nal-decoder.js');
			nalDecoder.addEventListener('message', function (event) {
				player.decode(event.data);
			}, false);

			$('#camera-video').html(player.canvas);

			log('Starting h264 decoder');

			// TODO
			setTimeout(function () {
				stream = createStream(function (data, loaded) {
					nalDecoder.postMessage(data);
					//console.log(loaded, data.byteLength);
				});
			}, 1500);
		},
		stop: function () {
			sendCommand('camera-preview', false);

			if (stream) {
				stream.abort();
				stream = null;
			}
			if (nalDecoder) {
				nalDecoder.terminate();
				nalDecoder = null;
			}
		},
		play: function () {
			if (!stream) return this.start();
			stream.play();
		},
		pause: function () {
			if (!stream) return;
			stream.pause();
		},
		restart: function () {
			this.stop();
			this.start();
		},
		isEnabled: function () {
			return (stream) ? true : false;
		}
	};

	window.cameraPreview = cameraPreview;
})();

(function () {
	var graphs = {};

	var graphNames = [
		'gyro_x', 'gyro_y', 'gyro_z',
		'accel_x', 'accel_y', 'accel_z',
		'rotation_x', 'rotation_y', 'rotation_z',
		'motors_speed_0', 'motors_speed_1', 'motors_speed_2', 'motors_speed_3'
	];
	for (var i = 0; i < graphNames.length; i++) {
		var name = graphNames[i];
		graphs[name] = new TimeSeries();
	}

	window.graphs = graphs;
})();

$(function () {
	var chartStyle = {
		grid: {
			fillStyle: 'transparent',
			borderVisible: false
		}
	};
	var redLine = { strokeStyle: 'rgb(255, 0, 0)' };
	var greenLine = { strokeStyle: 'rgb(0, 255, 0)' };
	var blueLine = { strokeStyle: 'rgb(0, 0, 255)' };
	var yellowLine = { strokeStyle: 'yellow' };

	var gyro = new SmoothieChart(chartStyle);
	gyro.streamTo(document.getElementById('sensor-gyro-graph'));
	gyro.addTimeSeries(graphs.gyro_x, redLine);
	gyro.addTimeSeries(graphs.gyro_y, greenLine);
	gyro.addTimeSeries(graphs.gyro_z, blueLine);

	var accel = new SmoothieChart(chartStyle);
	accel.streamTo(document.getElementById('sensor-accel-graph'));
	accel.addTimeSeries(graphs.accel_x, redLine);
	accel.addTimeSeries(graphs.accel_y, greenLine);
	accel.addTimeSeries(graphs.accel_z, blueLine);

	var rotation = new SmoothieChart(chartStyle);
	rotation.streamTo(document.getElementById('sensor-rotation-graph'));
	rotation.addTimeSeries(graphs.rotation_x, redLine);
	rotation.addTimeSeries(graphs.rotation_y, greenLine);
	rotation.addTimeSeries(graphs.rotation_z, blueLine);

	var motorsSpeed = new SmoothieChart(chartStyle);
	motorsSpeed.streamTo(document.getElementById('motors-speed-graph'));
	motorsSpeed.addTimeSeries(graphs.motors_speed_0, redLine);
	motorsSpeed.addTimeSeries(graphs.motors_speed_1, greenLine);
	motorsSpeed.addTimeSeries(graphs.motors_speed_2, blueLine);
	motorsSpeed.addTimeSeries(graphs.motors_speed_3, yellowLine);
});

(function () {
	var header, data;
	var isRecording = false;
	var graphsExport = {
		start: function () {
			isRecording = true;
			this.reset();
		},
		stop: function () {
			isRecording = false;
		},
		reset: function () {
			header = ['timestamp'];
			data = [];
		},
		isRecording: function () {
			return isRecording;
		},
		append: function (name, timestamp, dataset) {
			if (!isRecording) return;

			var lastline = data[data.length - 1];

			var line = new Array(header.length);
			line[0] = timestamp;

			var hasPushedNewData = false;
			for (var key in dataset) {
				var value = dataset[key];
				var headerKey = name+'.'+key;
				var i = header.indexOf(headerKey);
				if (i >= 0) {
					if (lastline && !hasPushedNewData && typeof lastline[i] != 'number') {
						lastline[i] = value;
					} else {
						line[i] = value;
						hasPushedNewData = true;
					}
				} else {
					header.push(headerKey);
					if (lastline) {
						lastline.push(value);
					} else {
						line.push(value);
						hasPushedNewData = true;
					}
				}
			}

			if (hasPushedNewData) {
				data.push(line);
			}
		},
		toCsv: function () {
			if (!data || !header) return;

			var csv = '';
			csv += header.join(',');

			for (var i = 0; i < data.length; i++) {
				var line = data[i].join(',');
				csv += '\n'+line;
			}

			return csv;
		}
	};

	window.graphsExport = graphsExport;
})();

function init(quad) {
	var joystick = new Joystick('#direction-input', function (data) {
		//sendCommand('orientation', data);
		//TODO
		sendCommand('rotation-speed', {
			x: data.beta,
			y: data.gamma,
			z: data.alpha
		});
	});

	if (DeviceOrientationJoystick.isSupported()) {
		var $switch = $('#orientation-switch');
		var devOrientation = new DeviceOrientationJoystick(function (data) {
			if ($switch.prop('checked')) {
				sendCommand('orientation', data);
			}
		});
	}

	var lastPower;
	$('#power-input').on('input', function () {
		var val = parseFloat($(this).val());
		if (lastPower === val) {
			return;
		}

		lastPower = val;
		sendCommand('power', val / 100);
	});

	$('#power-switch').change(function () {
		sendCommand('enable', $(this).prop('checked'));
	});

	$('#pid-switch').change(function () {
		sendCommand('pid-enable', $(this).prop('checked'));
	});

	$('#calibrate-sensor-btn').click(function () {
		var calibration = {};
		var types = ['gyro', 'accel'];
		for (var i = 0; i < types.length; i++) {
			var type = types[i];
			calibration[type] = {};
			for (var axis in quad.orientation[type]) {
				calibration[type][axis] = - quad.orientation[type][axis];
			}
		}

		// z accel is 1, because of gravitation :-P
		calibration.accel.z -= 1;

		quad.config.mpu6050.calibration = calibration;
		sendCommand('config', quad.config);
	});

	$('#camera-play-btn').click(function () {
		cameraPreview.play();
	});
	$('#camera-pause-btn').click(function () {
		cameraPreview.pause();
	});
	$('#camera-stop-btn').click(function () {
		cameraPreview.stop();
	});

	$('#camera-record-btn').click(function () {
		$(this).toggleClass('active');
		var enabled = $(this).is('.active');
		sendCommand('camera-record', enabled);
		$('#camera-status-recording').toggle(enabled);
	});

	$('#sensor-record-btn').click(function () {
		if (graphsExport.isRecording()) {
			graphsExport.stop();
		} else {
			graphsExport.start();
		}
		$('#sensor-status-recording').toggle(graphsExport.isRecording());
	});
	$('#sensor-export-btn').click(function () {
		var csv = graphsExport.toCsv();
		if (!csv) return;
		var blob = new Blob([csv], { type: 'text/csv' });
		var url = URL.createObjectURL(blob);
		window.open(url);
	});
}

$(function () {
	var schemas = {};
	var quad = {};

	// Console
	var $console = $('#console pre');

	function log(msg, type) {
		if (type) {
			msg = '<span class="'+type+'">'+msg+'</span>';
		}
		$console.append(msg, '\n');
	}
	window.log = log;

	// Events handlers
	var handlers = {};

	handlers.error = function (event) {
		log(event.msg, 'error');
	};
	handlers.info = function (event) {
		log(event.msg, 'info');
	};

	handlers.enabled = function (event) {
		$('#power-switch').prop('checked', event.enabled);
	};

	handlers.power = function (event) {
		$('#power-input').val(event.power * 100);
	};

	handlers['motors-speed'] = function (event) {
		quad.motorsSpeed = event.speed;

		schemas.top.setSpeed(event.speed);
		schemas.sideX.setSpeed(event.speed.slice(0, 2));
		schemas.sideY.setSpeed(event.speed.slice(2, 4));

		var $stats = $('#motors-stats');
		var speeds = event.speed.map(function (speed) {
			return Math.round(speed * 100);
		}).join('<br>');
		$stats.find('.motors-speed').html(speeds);

		var timestamp = new Date().getTime();
		graphs.motors_speed_0.append(timestamp, event.speed[0]);
		graphs.motors_speed_1.append(timestamp, event.speed[1]);
		graphs.motors_speed_2.append(timestamp, event.speed[2]);
		graphs.motors_speed_3.append(timestamp, event.speed[3]);

		graphsExport.append('motors-speed', timestamp, event.speed);
	};

	handlers.orientation = function (event) {
		quad.orientation = event.data;

		schemas.sideX.setRotation(event.data.rotation.x);
		schemas.sideY.setRotation(event.data.rotation.y);

		var objectValues = function (obj) {
			var list = [];
			for (var key in obj) {
				var val = obj[key];
				if (typeof val == 'number') { // Only keep two digits after the comma
					val = Math.round(val * 100) / 100;
				}
				list.push(val);
			}
			return list;
		};

		var $stats = $('#sensor-stats');
		$stats.find('.sensor-gyro').text(objectValues(event.data.gyro));
		$stats.find('.sensor-accel').text(objectValues(event.data.accel));
		$stats.find('.sensor-rotation').text(objectValues(event.data.rotation));
		$stats.find('.sensor-temp').text(Math.round(event.data.temp));

		// Graphs
		var timestamp = new Date().getTime();

		graphs.gyro_x.append(timestamp, event.data.gyro.x);
		graphs.gyro_y.append(timestamp, event.data.gyro.y);
		graphs.gyro_z.append(timestamp, event.data.gyro.z);

		graphs.accel_x.append(timestamp, event.data.accel.x);
		graphs.accel_y.append(timestamp, event.data.accel.y);
		graphs.accel_z.append(timestamp, event.data.accel.z);

		graphs.rotation_x.append(timestamp, event.data.rotation.x);
		graphs.rotation_y.append(timestamp, event.data.rotation.y);
		//graphs.rotation_z.append(timestamp, event.data.rotation.z);
		
		for (var name in event.data) {
			graphsExport.append(name, timestamp, event.data[name]);
		}
	};

	handlers['os-stats'] = function (event) {
		quad.osStats = event;

		var $stats = $('#os-stats');

		var loadavg = [];
		for (var i = 0; i < event.loadavg.length; i++) {
			var avg = event.loadavg[i];
			var pct = Math.round(avg * 100);
			loadavg.push('<span style="color: '+colorToRgb(shadeColor(getColorForPercentage(1 - avg), -0.5))+';">'+pct+'%</span>');
		}
		$stats.find('.os-loadavg').html(loadavg.join(', '));

		var memPct = event.mem.free / event.mem.total;
		$stats.find('.os-mem')
			.text(event.mem.free + '/' + event.mem.total + ' ('+Math.round(memPct * 100)+'%)')
			.css('color', colorToRgb(shadeColor(getColorForPercentage(1 - memPct), -0.5)));
	};

	// TODO: if config is sent twice, events are listened twice too
	handlers.config = function (event) {
		var cfg = event.config;
		quad.config = cfg;

		var accessor = function (prop, value) {
			var path = prop.split('.');

			var obj = cfg;
			for (var i = 0; i < path.length; i++) {
				var node = path[i];
				if (obj instanceof Array) {
					node = parseInt(node);
				}

				if (typeof obj[node] == 'undefined') {
					return;
				}

				if (i == path.length - 1) { // Last one
					if (typeof value == 'undefined') {
						return obj[node];
					} else {
						obj[node] = value;
					}
				} else {
					obj = obj[node];
					if (!obj) return;
				}
			}

			return obj;
		};

		var handleInput = function (input, domain) {
			var name = $(input).attr('name');
			if (!name) {
				return;
			}
			if (domain) {
				name = domain+'.'+name;
			}

			var val = accessor(name);
			if (typeof val != 'undefined') {
				if ($(input).is('input')) {
					$(input).attr('value', val);
				} else if ($(input).is('select')) {
					$(input).find('option').each(function () {
						var name = $(this).attr('value');
						if (typeof name == 'undefined') {
							name = $(this).html();
						}
						if (name == val) {
							$(this).attr('selected', '');
						}
					});
				}
				$(input).val(val);
			}

			$(input).change(function () {
				var val = $(input).val();
				if ($(input).is('input')) {
					var type = $(input).attr('type');
					switch (type) {
						case 'number':
						case 'range':
							val = parseFloat(val);
							break;
						case 'checkbox':
							val = $(input).prop('checked');
							break;
					}
				}
				accessor(name, val);
			});
		};

		var $form = $('#config-form');
		$form.find('input,select').each(function (i, input) {
			handleInput(input);
		});
		$form.submit(function (event) {
			event.preventDefault();

			sendCommand('config', cfg);
		});
		$form.find('#export-config-btn').click(function () {
			var json = JSON.stringify(cfg, null, '\t');
			var blob = new Blob([json], { type: 'application/json' });
			var url = URL.createObjectURL(blob);
			window.open(url);
		});

		// Camera config
		var $camForm = $('#camera-config-form');
		$camForm.find('input,select').each(function (i, input) {
			handleInput(input, 'camera.preview');
		});
		$camForm.submit(function (event) {
			event.preventDefault();

			sendCommand('config', cfg);

			if (cameraPreview.isEnabled()) {
				cameraPreview.restart();
			}
		});

		$('#ISO-switch').change(function () {
			if ($(this).prop('checked')) {
				var val = parseInt($camForm.find('[name="ISO"]').val());
				accessor('camera.preview.ISO', val);
			} else {
				accessor('camera.preview.ISO', null);
			}
		});
		$camForm.find('[name="ISO"]').change(function () {
			$('#ISO-switch').prop('checked', true);
		});
	};

	// Inject SVGs into HTML to be able to style and animate them
	var svgs = $('img[src$=".svg"]');
	SVGInjector(svgs, null, function () {
		schemas.top = new QuadcopterSchema('#quadcopter-top');
		schemas.sideX = new QuadcopterSchema('#quadcopter-side-x');
		schemas.sideY = new QuadcopterSchema('#quadcopter-side-y');

		// Init
		log('Connecting to server...');

		ws = new WebSocket('ws://'+window.location.host+'/socket');
		ws.binaryType = 'arraybuffer';

		ws.addEventListener('open', function () {
			log('Connection opened.');
			init(quad);
		});

		ws.addEventListener('error', function (event) {
			console.error(error);
			log('Connection error!', 'error');
		});

		ws.addEventListener('close', function () {
			log('Connection closed.', 'info');
		});

		ws.addEventListener('message', function (event) {
			var msg = BSON.deserialize(new Uint8Array(event.data));
			
			if (!handlers[msg.type]) {
				console.error('Unsupported message type: "'+msg.type+'"');
				return;
			}

			handlers[msg.type](msg);
		});
	});
});