// Classic scripts share the global scope, so keep these bindings out of it.
( () => {
	const { createElement: el } = wp.element;
	const { __experimentalMainDashboardButton: MainDashboardButtonSlot } = wp.editPost;
	const { registerPlugin } = wp.plugins;
	const { Button, Icon } = wp.components;

	// We replace the MainDashboardButton because we want to control the href.
	function MainDashboardButton() {
		return el(
			MainDashboardButtonSlot,
			null,
			el( Button, {
				className: 'wporg-gutenberg-w-button',
				href: document.referrer.length ? document.referrer : '//wordpress.org',
				text: el( Icon, { icon: 'wordpress' } ),
			} )
		);
	}

	registerPlugin( 'main-dashboard-button-plugin', {
		render: MainDashboardButton,
	} );
} )();
