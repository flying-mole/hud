'use strict';

var h = require('mercury').h;

module.exports = function (label, inputs) {
	return h('.form-group', [
		h('label.col-md-2.control-label', label),
		h('.col-md-10.form-inline', inputs)
	]);
};
