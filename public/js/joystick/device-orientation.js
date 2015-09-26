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

module.exports = DeviceOrientationJoystick;
