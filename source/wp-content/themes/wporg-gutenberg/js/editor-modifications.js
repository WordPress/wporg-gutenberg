/* eslint-disable no-undef */
var hooks = wp.hooks;
var __ = wp.i18n.__;

// Update the publish button text
hooks.addFilter( 'i18n.gettext', 'wporg-gutenberg/update-btn-text', ( translation, text ) => {
	if ( text === 'Submit for Review' ) {
		return __( 'Publish', 'wporg' );
	}
	return translation;
} );

_wpLoadBlockEditor.then( function () {
	wp.blocks.unregisterBlockType( 'core/shortcode' );
} );

// Keep the URL on the front page: the editor's BrowserURL rewrites it to wp-admin's
// post.php on mount, which would bounce a logged-out visitor to login on reload.
const originalReplaceState = window.history.replaceState.bind( window.history );
window.history.replaceState = function ( state, title, url ) {
	if ( typeof url === 'string' && url.indexOf( 'post.php' ) !== -1 ) {
		return;
	}
	return originalReplaceState( state, title, url );
};

// Use a middleware provider to intercept and modify API calls. Short-circuit POST requests, bound queries, allow media, etc.
wp.apiFetch.use( function ( options, next ) {
	const isWhitelistedEndpoint = options.path.startsWith( '/oembed/1.0/proxy' );

	// Block writes to keep Frontenberg read-only, but let GET and OPTIONS through:
	// OPTIONS are the editor's canUser() probes, which expect a Response (headers).
	const method = ( options.method || 'GET' ).toUpperCase();
	const isWrite = 'POST' === method || 'PUT' === method || 'PATCH' === method || 'DELETE' === method;
	if ( isWrite && ! isWhitelistedEndpoint ) {
		// This works in enough cases to be the default return value.
		return Promise.resolve( options.data );
	}

	// Add limits to all GET queries which attempt unbound queries
	options.path = options.path.replace( 'per_page=-1', 'per_page=10' );

	// Load images with the view context, seems to work
	if ( options.path.startsWith( '/wp/v2/media/' ) ) {
		options.path = options.path.replace( 'context=edit', 'context=view' );
	}

	return next( options );
} );

// Add a middleware provider which intercepts all uploads and stores them within the browser
wp.apiFetch.use( function ( options, next ) {
	if ( options.method === 'POST' && options.path === '/wp/v2/media' ) {
		const file = options.body.get( 'file' );

		window.fakeUploadedMedia = window.fakeUploadedMedia || [];
		if ( ! window.fakeUploadedMedia.length ) {
			window.fakeUploadedMedia[ 9999000 ] = {};
		}
		const id = window.fakeUploadedMedia.length;

		window.fakeUploadedMedia[ id ] = {
			id,
			date: '',
			date_gmt: '',
			modified: '',
			modified_gmt: '',
			guid: {},
			title: { rendered: file.name, raw: file.name },
			description: {},
			caption: {},
			alt_text: '',
			slug: file.name,
			status: 'inherit',
			type: 'attachment',
			link: '',
			author: 0,
			comment_status: 'open',
			ping_status: 'closed',
			media_details: {},
			media_type: file.type.split( '/' )[ 0 ],
			mime_type: file.type,
			source_url: '', // This gets filled below with a data uri
			_links: {},
		};

		return new Promise( function ( resolve ) {
			const a = new FileReader();
			a.onload = function ( e ) {
				window.fakeUploadedMedia[ id ].source_url = e.target.result;
				resolve( window.fakeUploadedMedia[ id ] );
			};
			a.readAsDataURL( file );
		} );
	}

	// Drag droped media of ID 9999xxx is stored within the Browser
	const pathIdMatch = options.path.match( '^/wp/v2/media/(9999\\\\d+)' );
	if ( pathIdMatch ) {
		return Promise.resolve( window.fakeUploadedMedia[ pathIdMatch[ 1 ] ] );
	}

	return next( options );
} );
