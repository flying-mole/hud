'use strict';

var document = require('global/document');
var request = require('browser-request');

function InlineSvg(url) {
	if (!(this instanceof InlineSvg)) {
		return new InlineSvg(url);
	}

	this.url = url;
}

InlineSvg.prototype.type = 'Widget';

InlineSvg.prototype.init = function () {
	var self = this;

	var tmp = document.createElement('svg');
	this.element = tmp;

	request(this.url, function (err, res, body) {
		if (err) {
			return; // TODO
		}

		var parser = new DOMParser();
		var doc = parser.parseFromString(body, 'application/xml');
		var svg = doc.documentElement;
		self.element = svg;

		svg.removeAttribute('width');
		svg.removeAttribute('height');

		tmp.parentNode.replaceChild(svg, tmp);
	});

	return tmp;
};

InlineSvg.prototype.update = function () {};

module.exports = InlineSvg;
