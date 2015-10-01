function DeviceOrientationInput(cmd) {
	if (!DeviceOrientationInput.isSupported()) {
		throw new Error('DeviceOrientation not supported');
	}

	window.addEventListener('deviceorientation', function (event) {
		cmd.send('orientation', {
			x: event.beta, // front-to-back tilt in degrees, where front is positive
			y: event.gamma, // left-to-right tilt in degrees, where right is positive
			z: event.alpha
		});
	}, false);
}

DeviceOrientationInput.isSupported = function () {
	return (typeof window.DeviceOrientationEvent != 'undefined');
};

module.exports = DeviceOrientationInput;
