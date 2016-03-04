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
var ChartRecorder = require('./widget/chart-recorder');
var Camera = require('./widget/camera');
var Config = require('./widget/config');

var DirectionSender = require('./direction-sender');
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
		chartRecorder: ChartRecorder(quad),
		charts: Charts(quad),
		camera: Camera(quad),
		cameraAvailable: hg.value(false),
		config: Config(quad)
	});

	quad.init();

	quad.on('features', function (features) {
		state.cameraAvailable.set(features.hardware.indexOf('camera') !== -1);
	});

	var sender = DirectionSender(quad.cmd);
	sender(state.direction.mouse);

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
				hg.partial(CalibrateBtn.render, state.calibrateBtn),
				' ',
				hg.partial(ChartRecorder.render, state.chartRecorder)
			]),
		])),
		h('.container-fluid', hg.partial(Charts.render, state.charts)),

		h('#camera', {
			style: { display: (state.cameraAvailable) ? 'block' : 'none' }
		}, [
			h('hr'),
			h('.container-fluid', hg.partial(Camera.render, state.camera))
		]),

		h('hr'),
		h('.container-fluid', hg.partial(Config.render, state.config)),

		hg.partial(Alerts.render, state.alerts)
	]);
};

hg.app(document.body, App(), App.render);

/*function init(quad) {
	keyBindings(quad);

	$('#camera-config-preview').submit(function () {
		if (cameraPreview.isStarted()) {
			setTimeout(function () {
				cameraPreview.restart();
			}, 500);
		}
	});
}*/
