var select   = wp.data.select;
var dispatch = wp.data.dispatch;

if ( select( 'core/edit-post' ).isEditorSidebarOpened() ) {
    dispatch( 'core/edit-post' ).closeGeneralSidebar();
}

if( select( 'core/edit-post' ).isFeatureActive( 'welcomeGuide' ) ) {
    dispatch( 'core/edit-post' ).toggleFeature( 'welcomeGuide' );
}

// We don't want the post to appear publishable
dispatch('core/editor').disablePublishSidebar()

// Always lock the post
dispatch('core/editor').lockPostSaving()

_wpLoadBlockEditor.then( function() { 
    wp.blocks.unregisterBlockType( 'core/shortcode' );
} );

// Use a middleware provider to intercept and modify API calls. Short-circuit POST requests, bound queries, allow media, etc.
wp.apiFetch.use( function( options, next ) {
    var isWhitelistedEndpoint = (
        lodash.startsWith( options.path, "/oembed/1.0/proxy" ) ||
        lodash.startsWith( options.path, "/gutenberg/v1/block-renderer" )
    );

    // Prevent non-whitelisted non-GET requests (ie. POST) to prevent errors
    if ( options.method && options.method !== "GET" && ! isWhitelistedEndpoint ) {
        // This works in enough cases to be the default return value.
        return Promise.resolve( options.data );
    }

    // Add limits to all GET queries which attempt unbound queries
    options.path = options.path.replace( "per_page=-1", "per_page=10" );

    // Load images with the view context, seems to work
    if ( lodash.startsWith( options.path, "/wp/v2/media/" ) ) {
        options.path = options.path.replace( "context=edit", "context=view" );
    }

    return next( options );
 } );

// Use a middleware preloader to handle the "types" API endpoints with minimal data needed
wp.apiFetch.use( wp.apiFetch.createPreloadingMiddleware( {
    "/wp/v2/types?context=edit": { "body": {
        "page": {
            "rest_base": "pages",
            "supports": {},
            "labels": {
                "singular_name": "Page",
            }
        },
        "wp_block": {
            "rest_base": "blocks",
            "supports": {},
            "labels": {
                "singular_name": "Block",
            }
        }
    } },
    "/wp/v2/types/page?context=edit": { "body": {
        "rest_base": "pages",
        "supports": {},
        "labels": {
            "singular_name": "Page",
        }
    } },
    "/wp/v2/types/wp_block?context=edit": { "body": {
        "rest_base": "blocks",
        "supports": {},
        "labels": {
            "singular_name": "Block",
        }
    } }
 } ) );

// Add a middleware provider which intercepts all uploads and stores them within the browser
 wp.apiFetch.use( function( options, next ) {
    if ( options.method == "POST" && options.path == "/wp/v2/media" ) {
        var file = options.body.get("file");

        window.fakeUploadedMedia = window.fakeUploadedMedia || [];
        if ( ! window.fakeUploadedMedia.length ) {
            window.fakeUploadedMedia[9999000] = {};
        }
        var id = window.fakeUploadedMedia.length;

        window.fakeUploadedMedia[ id ] = {
            "id": id,
            "date": "", "date_gmt": "", "modified": "", "modified_gmt": "",
            "guid": {}, "title": { "rendered": file.name, "raw": file.name },
            "description": {}, "caption": {}, "alt_text": "",
            "slug": file.name, "status": "inherit", "type": "attachment", "link": "",
            "author": 0, "comment_status": "open", "ping_status": "closed",
            "media_details": {}, "media_type": file.type.split("/")[0], "mime_type": file.type,
            "source_url": "", // This gets filled below with a data uri
            "_links": {}
        };

        return new Promise( function( resolve ) {
            var a = new FileReader();
            a.onload = function(e) {
                window.fakeUploadedMedia[ id ].source_url = e.target.result;
                resolve( window.fakeUploadedMedia[ id ] );
            }
            a.readAsDataURL( file );
        } );
    }

    // Drag droped media of ID 9999xxx is stored within the Browser
    var path_id_match = options.path.match( "^/wp/v2/media/(9999\\\\d+)" );
    if ( path_id_match ) {
        return Promise.resolve( window.fakeUploadedMedia[ path_id_match[1] ] );
    }

    return next( options );
} );
