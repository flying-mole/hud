'use strict';

var document = require('global/document');
var hg = require('mercury');
var h = require('mercury').h;

var Quadcopter = require('./quadcopter');
var Tabs = require('./component/tabs');

var Console = require('./widget/console');
var Alerts = require('./widget/alerts');
var EnableBtn = require('./widget/enable-btn');
var ControllerBtn = require('./widget/controller-btn');
var SystemSummary = require('./widget/system-summary');
var Charts = require('./widget/charts');
var PowerInput = require('./widget/power-input');
var RotationInput = require('./widget/rotation-input');
var Outline = require('./widget/outline');
var MotorsSummary = require('./widget/motors-summary');
var OrientationSummary = require('./widget/orientation-summary');
var CalibrateBtn = require('./widget/calibrate-btn');
var Config = require('./widget/config');

var MouseDirection = require('./direction/mouse');
var DeviceOrientationDirection = require('./direction/device-orientation');
var GamepadDirection = require('./direction/gamepad');
var StepDirection = require('./direction/step');
var SineDirection = require('./direction/sine');
var RampDirection = require('./direction/ramp');

function App() {
	var quad = new Quadcopter();

	var state = hg.state({
		console: Console(quad),
		alerts: Alerts(quad),
		enableBtn: EnableBtn(quad),
		controllerBtn: ControllerBtn(quad),
		systemSummary: SystemSummary(quad),
		directionTabs: Tabs(['custom', 'step', 'sine', 'ramp']),
		direction: hg.struct({
			mouse: MouseDirection(),
			deviceOrientation: DeviceOrientationDirection(),
			gamepad: GamepadDirection(),
			step: StepDirection(),
			sine: SineDirection(),
			ramp: RampDirection()
		}),
		powerInput: PowerInput(quad),
		rotationInput: RotationInput(quad),
		outline: hg.struct({
			top: Outline.Top(quad),
			front: Outline.Front(quad),
			right: Outline.Right(quad)
		}),
		motorsSummary: MotorsSummary(quad),
		orientationSummary: OrientationSummary(quad),
		calibrateBtn: CalibrateBtn(quad),
		charts: Charts(quad),
		config: Config(quad)
	});

	quad.init();

	return state;
}

App.render = function (state) {
	return h('#app', [
		hg.partial(Console.render, state.console),
		h('hr'),
		h('.container-fluid', h('.row', [
			h('.col-sm-6.col-xs-12', [
				hg.partial(EnableBtn.render, state.enableBtn),
				hg.partial(ControllerBtn.render, state.controllerBtn)
			]),
			h('.col-sm-6.col-xs-12', [
				hg.partial(SystemSummary.render, state.systemSummary)
			])
		])),
		h('hr'),
		h('.container-fluid', h('.row', [
			h('.col-lg-3.col-xs-6.text-center', [ // .hidden-xs.hidden-sm
				h('div', [
					h('strong', 'Direction'),
					hg.partial(Tabs.render, state.directionTabs)
				]),
				Tabs.renderContainer(state.directionTabs, 'custom', [
					hg.partial(MouseDirection.render, state.direction.mouse),
					hg.partial(DeviceOrientationDirection.render, state.direction.deviceOrientation),
					hg.partial(GamepadDirection.render, state.direction.gamepad)
				]),
				Tabs.renderContainer(state.directionTabs, 'step', [
					hg.partial(StepDirection.render, state.direction.step)
				]),
				Tabs.renderContainer(state.directionTabs, 'sine', [
					hg.partial(SineDirection.render, state.direction.sine)
				]),
				Tabs.renderContainer(state.directionTabs, 'ramp', [
					hg.partial(RampDirection.render, state.direction.ramp)
				])
			]),
			h('.col-lg-2.col-sm-3.col-xs-6.text-center', hg.partial(PowerInput.render, state.powerInput)),
			h('.col-lg-1.col-sm-3.col-xs-6.text-center', hg.partial(RotationInput.render, state.rotationInput)),
			h('span.clearfix.visible-sm'),
			h('.col-lg-3.col-sm-6.col-xs-12.text-center', [
				hg.partial(Outline.Top.render, state.outline.top),
				hg.partial(MotorsSummary.render, state.motorsSummary)
			]),
			h('.col-lg-3.col-sm-6.col-xs-12.text-center', [
				hg.partial(Outline.Front.render, state.outline.front),
				hg.partial(Outline.Right.render, state.outline.right),
				hg.partial(OrientationSummary.render, state.orientationSummary),
				hg.partial(CalibrateBtn.render, state.calibrateBtn)
			]),
		])),
		h('.container-fluid', hg.partial(Charts.render, state.charts)),
		h('hr'),
		h('.container-fluid', hg.partial(Config.render, state.config)),

		hg.partial(Alerts.render, state.alerts)
	]);
};

hg.app(document.body, App(), App.render);

/*var SVGInjector = require('svg-injector');
var smoothie = require('smoothie');
var colors = require('./colors');
var keyBindings = require('./key-bindings');
var graphsExport = require('./graphs-export');
var CameraPreview = require('./camera-preview');
var QuadcopterSchema = require('./quad-schema');
var Quadcopter = require('./quadcopter');

var input = {
	Mouse: require('./input/mouse'),
	DeviceOrientation: require('./input/device-orientation'),
	Gamepad: require('./input/gamepad'),
	Step: require('./input/step'),
	Sine: require('./input/sine'),
	Ramp: require('./input/ramp')
};

function init(quad) {
	keyBindings(quad);

	var mouseInput = new input.Mouse(quad.cmd, '#direction-input');

	if (input.Gamepad.isSupported()) {
		var devOrientation = new input.Gamepad(quad.cmd);

		$('#orientation-switch').change(function () {
			if ($(this).prop('checked')) {
				devOrientation.start();
			} else {
				devOrientation.stop();
			}
		});
	}
	if (input.Gamepad.isSupported()) {
		var gamepadInput = new input.Gamepad(quad.cmd);
	}

	$('#direction-type-tabs').tabs();

	var stepInput = new input.Step(quad.cmd);
	$('#direction-step').submit(function (event) {
		event.preventDefault();

		var data = $(this).serializeObject();

		stepInput.start({
			x: parseFloat(data.x),
			y: parseFloat(data.y),
			z: parseFloat(data.z),
			duration: parseFloat(data.duration) * 1000
		});
	});

	var sineInput = new input.Sine(quad.cmd);
	$('#direction-sine').submit(function (event) {
		event.preventDefault();

		var data = $(this).serializeObject();

		sineInput.start({
			amplitude: parseFloat(data.amplitude),
			frequency: parseFloat(data.frequency),
			offset: parseFloat(data.offset),
			axis: data.axis
		});
	});
	$('#direction-sine-stop').click(function () {
		sineInput.stop();
	});

	var rampInput = new input.Ramp(quad.cmd);
	$('#direction-ramp').submit(function (event) {
		event.preventDefault();

		var data = $(this).serializeObject();
		data.slope = parseFloat(data.slope);

		rampInput.start(data);
	});
	$('#direction-ramp-stop').click(function () {
		rampInput.stop();
	});

	var cameraPreview = new CameraPreview(quad.cmd);
	cameraPreview.on('start', function () {
		$('#camera-video').html(cameraPreview.player.canvas);
	});
	cameraPreview.on('error', function (err) {
		log(err, 'error');
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
	$('#camera-config-preview').submit(function () {
		if (cameraPreview.isStarted()) {
			setTimeout(function () {
				cameraPreview.restart();
			}, 500);
		}
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

	var quad = new Quadcopter();

	// Add target to graphs export
	(function () {
		var target;
		quad.cmd.on('orientation', function (t) {
			target = t;
		});
		quad.on('motors-speed', function () {
			var timestamp = new Date().getTime();
			if (graphs.axes) {
				for (var axis in target) {
					if (graphs.axes.indexOf(axis) == -1) {
						delete target[axis];
					}
				}
			}
			graphsExport.append('target', timestamp, target)
		});
	})();

	quad.on('motors-speed', function (speeds) {
		var exportedSpeeds = speeds.slice();
		if (graphs.axes) {
			if (graphs.axes.indexOf('x') == -1) {
				exportedSpeeds[0] = undefined;
				exportedSpeeds[2] = undefined;
			}
			if (graphs.axes.indexOf('y') == -1) {
				exportedSpeeds[1] = undefined;
				exportedSpeeds[3] = undefined;
			}
		}
		graphsExport.append('motors-speed', timestamp, exportedSpeeds);
	});

	quad.on('orientation', function (orientation) {
		// Graphs
		var timestamp = new Date().getTime();

		function appendAxes(name, data) {
			var axes = graphs.axes || ['x', 'y', 'z'];

			var exportedData = {};
			for (var i = 0; i < axes.length; i++) {
				var axis = axes[i];
				if (typeof data[axis] == 'undefined') continue;

				var value = data[axis];
				exportedData[axis] = value;
			}

			graphsExport.append(name, timestamp, exportedData);
		}

		appendAxes('gyro', orientation.gyro);
		appendAxes('accel', orientation.accel);
		appendAxes('rotation', orientation.rotation);
	});

	// TODO: handle multiple config changes
	quad.once('config', function (cfg) {
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
		function initCameraConfigForm(form, type) {
			var $form = $(form);

			$form.find('input,select').each(function (i, input) {
				handleInput(input, 'camera.'+type);
			});
			$form.submit(function (event) {
				event.preventDefault();

				sendCommand('config', cfg);
			});

			$form.find('#ISO-switch').change(function () {
				if ($(this).prop('checked')) {
					var val = parseInt($form.find('[name="ISO"]').val());
					accessor('camera.preview.ISO', val);
				} else {
					accessor('camera.preview.ISO', null);
				}
			});
			$form.find('[name="ISO"]').change(function () {
				$form.find('#ISO-switch').prop('checked', true);
			});
		}
		initCameraConfigForm('#camera-config-preview', 'preview');
		initCameraConfigForm('#camera-config-record', 'record');

		// PID controller config
		$('#controller-btn').val(cfg.controller.updater);
	});

	quad.on('features', function (features) {
		if (features.hardware.indexOf('camera') === -1) {
			$('#camera').hide();
		}
	});

	var cameraConfigHtml = $('#camera-config-inputs').html();
	$('#camera-config-preview, #camera-config-record').html(cameraConfigHtml);
});
*/
