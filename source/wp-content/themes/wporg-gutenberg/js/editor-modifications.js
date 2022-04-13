var select = wp.data.select;
var dispatch = wp.data.dispatch;

if (select( "core/edit-post" ).isEditorSidebarOpened()) {
    dispatch( "core/edit-post" ).closeGeneralSidebar();
}

dispatch( "core/edit-post" ).toggleFeature( "welcomeGuide" )

_wpLoadBlockEditor.then( function() { 
    wp.blocks.unregisterBlockType( "core/shortcode" ); 
} );