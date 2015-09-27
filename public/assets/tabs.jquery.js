$.fn.tabs = function () {
	var that = this;

	var selectTab = function (tab) {
		that.find('a').each(function () {
			var show = $(this).is(tab);
			$(this).parent().toggleClass('active', show);
			$($(this).attr('href')).toggle(show);
		});
	};

	this.click(function (event) {
		event.preventDefault();
		selectTab(event.target);
	});

	selectTab(this.find('a').first());
};
