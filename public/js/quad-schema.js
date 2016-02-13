var $ = require('jquery');
var colors = require('./colors');

function QuadcopterSchema(svg) {
	this.svg = $(svg);
}

QuadcopterSchema.prototype.setSpeed = function (speed) {
	var propellers = this.svg.find('#propellers > g');

	for (var i = 0; i < speed.length; i++) {
		var s = speed[i];
		var color = colors.shade(colors.getForPercentage(1 - s), -0.5);
		$(propellers[i]).css('fill', colors.toRgb(color));
	}
};

QuadcopterSchema.prototype.setRotation = function (rot) {
	this.svg.css('transform', 'rotate('+rot+'deg)');
};

module.exports = QuadcopterSchema;
