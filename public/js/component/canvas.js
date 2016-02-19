'use strict';

var document = require('global/document');
var hg = require('mercury');
var h = require('mercury').h;

function Canvas(canvas) {
	if (!(this instanceof Canvas)) {
		return new Canvas(canvas);
	}

	this.canvas = canvas;
}

Canvas.prototype.type = 'Widget';

Canvas.prototype.init = function () {
	return this.canvas;
};

Canvas.prototype.update = function (prev, elem) {};

module.exports = Canvas;
