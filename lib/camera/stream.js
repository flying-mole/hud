var child = require('child_process');

var raspivid = function (options) {
	options = options || {};

	var args = [
		'--nopreview'
	];

	Object.keys(options).forEach(function (key) {
		var val = options[key];
		if (!val && val !== 0 && val !== '') return;

		args.push('--' + key);
		if ((val || val === 0) && val !== true && val !== '') {
			args.push(val);
		}
	});

	if (!options.output) {
		args.push('-o');
		args.push('-');
	}

	console.log('raspivid', args.join(' '));

	return child.spawn('raspivid', args, {
		stdio: ['ignore', 'pipe', 'inherit']
	});
};

// Doesn't support non-seekable streams with mp4
var avconv = function () {
	var args = [
		'-i',
		'pipe:0',
		'-f',
		'mp4',
		'-loglevel',
		'error', // See http://blog.jungkyungsuk.com/tag/loglevel/
		'pipe:1'
	];

	return child.spawn('avconv', args, {
		stdio: ['pipe', 'pipe', 'inherit']
	});
};

// Doesn't support mp4 streaming
var cvlc = function () {
	var args = [
		'-I',
		'dummy',
		'-v',
		'v4l2:///dev/video0',
		'--v4l2-chroma',
		'h264',
		'--v4l2-width',
		'800',
		'--v4l2-height',
		'600',
		'--sout',
		//'#standard{access=file,mux=mp4,dst=-}',
		'#standard{access=http,mux=ts,dst=0.0.0.0:3001}', // TODO
		':demux=h264'
	];

	// cvlc v4l2:///dev/video0 --v4l2-width 800 --v4l2-height 600 --v4l2-chroma h264 --sout '#standard{access=http,mux=ts,dst=0.0.0.0:12345}' -vvv

	return child.spawn('cvlc', args, {
		stdio: ['pipe', 'pipe', 'inherit']
	});
};

module.exports = raspivid;
