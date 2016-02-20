var child = require('child_process');
var cmdExists = require('cmd-exists-sync');

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

var avconv = function (options) {
	options = options || {};

	var args = [
		'-f', 'video4linux2',
		'-r', '30000/1001',
		'-i', '/dev/video0',
		'-b:a', '2M', // ?
		'-bt', '4M',
		'-vcodec', 'libx264',
		//'-pass', '1',
		'-profile:v', 'baseline',
		'-coder', '0',
		'-bf', '0',
		'-flags', '-loop', '-an',
		'-bsf:v', 'h264_mp4toannexb',
		'-f', 'h264'
	];

	if (options.timeout) {
		args.push('-t');
		args.push(options.timeout);
	}

	if (options.width && options.height) {
		args.push('-vf');
		args.push('scale='+options.width+':'+options.height);
	}

	if (options.framerate) {
		args.push('-r');
		args.push(options.framerate);
	}

	args.push('-');

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

if (cmdExists('raspivid')) {
	module.exports = raspivid;
} else if (cmdExists('avconv')) {
	module.exports = avconv;
} else {
	module.exports = function () {
		throw new Error('No recorder available');
	};
}
