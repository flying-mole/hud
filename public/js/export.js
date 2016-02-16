var window = require('global/window');

module.exports = function (opts) {
	var blob = new Blob([opts.body], { type: opts.type });
	var url = URL.createObjectURL(blob);
	window.open(url);
};
