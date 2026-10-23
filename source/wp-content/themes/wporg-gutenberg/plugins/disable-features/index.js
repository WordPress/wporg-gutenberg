var select = wp.data.select;
var dispatch = wp.data.dispatch;
var plugins = wp.plugins;

// Start every load with the sidebar closed, before the editor's mount would open its default one.
dispatch( 'core/preferences' ).set( 'core', 'isComplementaryAreaVisible', false );

/*
 We have to track whether we rendered because gutenberg will re-render plugins often.
 We only want to execute the code below on first render.
*/
let rendered = false;
function DisableFeaturePlugin() {
	if ( rendered ) {
		return null;
	}

	// Get rid of the welcome guide
	if ( select( 'core/edit-post' ).isFeatureActive( 'welcomeGuide' ) ) {
		dispatch( 'core/edit-post' ).toggleFeature( 'welcomeGuide' );
	}

	// Force fullscreen mode on load
	if ( ! select( 'core/edit-post' ).isFeatureActive( 'fullscreenMode' ) ) {
		dispatch( 'core/edit-post' ).toggleFeature( 'fullscreenMode' );
	}

	// Switch back to visual editor
	if ( select( 'core/edit-post' ).getEditorMode() === 'text' ) {
		dispatch( 'core/edit-post' ).switchEditorMode( 'visual' );
	}

	// We don't want the post to appear publishable
	dispatch( 'core/editor' ).disablePublishSidebar();

	// Always lock the post
	dispatch( 'core/editor' ).lockPostSaving();

	// Stop Autosaving
	dispatch( 'core/editor' ).lockPostAutosaving();

	rendered = true;

	return null;
}

plugins.registerPlugin( 'disable-gutenberg-features', {
	render: DisableFeaturePlugin,
} );
