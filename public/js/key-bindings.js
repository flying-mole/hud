module.exports = function (quad) {
	window.addEventListener('keydown', function (event) {
		switch (event.key) {
			case 'Escape':
			case 'Esc':
				quad.enabled = false;
				break;
			default:
				return;
		}
		event.preventDefault();
	});
};