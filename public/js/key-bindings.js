module.exports = function (quad) {
	window.addEventListener('keydown', function (event) {
		switch (event.key) {
			case 'Escape':
			case 'Esc':
				quad.enabled = false;
				break;
			case 'ArrowDown':
				quad.power -= 0.05;
				break;
			case 'ArrowUp':
				quad.power += 0.05;
				break;
			default:
				return;
		}
		event.preventDefault();
	});
};