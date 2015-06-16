module.exports = function (quad) {
	window.addEventListener('keydown', function (event) {
		var activeTag = document.activeElement.tagName.toLowerCase();

		// First-class key bindings
		// Always active
		var handled = true;
		switch (event.key) {
			case 'Escape':
			case 'Esc':
				quad.enabled = false;
				break;
			default:
				handled = false;
		}
		if (handled) {
			event.preventDefault();
			return;
		}

		// Check if an input has the focus
		// If so, stop here
		if (['input', 'textarea', 'select'].indexOf(activeTag) >= 0) return;

		// Second-class key bindings
		// Ignored when an input is being focused
		var handled = true;
		switch (event.key) {
			case 'ArrowDown':
				quad.power -= 0.05;
				break;
			case 'ArrowUp':
				quad.power += 0.05;
				break;
			default:
				handled = false;
		}
		if (handled) {
			event.preventDefault();
			return;
		}

		// Keyboard shortcuts with Alt key
		if (event.altKey) {
			switch (event.key) {
				case 's':
					quad.enabled = !quad.enabled;
					break;
				default:
					return;
			}
			event.preventDefault();
		}
	});
};