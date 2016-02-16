'use strict';

var hg = require('mercury');
var h = require('mercury').h;
var CameraConfig = require('./camera-config');

function Camera(quad) {
	return hg.state({
		config: CameraConfig(quad)
	});
}

Camera.render = function (state) {
	return h('.row', [
		h('.col-sm-6.col-xs-12', hg.partial(CameraConfig.render, state.config))
	]);
};

module.exports = Camera;
