const el = wp.element.createElement;
const editPost = wp.editPost;
const plugins = wp.plugins;
const Button = wp.components.Button;
const Icon = wp.components.Icon;

// We replace the MainDashboardButton because we want to control the href.
function MainDashboardButton() {
	return el(
		editPost.__experimentalMainDashboardButton,
		null,
		el( Button, {
			className: 'wporg-gutenberg-w-button',
			href: document.referrer.length ? document.referrer : '//wordpress.org',
			text: el( Icon, { icon: 'wordpress' } ),
		} )
	);
}

plugins.registerPlugin( 'main-dashboard-button-plugin', {
	render: MainDashboardButton,
} );
