var el = wp.element.createElement;
var editPost = wp.editPost;
var plugins = wp.plugins;
var Button = wp.components.Button;
var Icon = wp.components.Icon;

// We replace the MainDashboardButton because we want to control the href.
function MainDashboardButton() {
	return el(
		editPost.__experimentalMainDashboardButton,
		null,
		el( Button, {
			className: 'wporg-gutenberg-w-button',
			href: document.referrer.length
				? document.referrer
				: '//wordpress.org',
			text: el( Icon, { icon: 'wordpress' } ),
		} )
	);
}

plugins.registerPlugin( 'main-dashboard-button-plugin', {
	render: MainDashboardButton,
} );
