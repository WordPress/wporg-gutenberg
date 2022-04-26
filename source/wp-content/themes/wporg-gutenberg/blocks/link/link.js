var el = wp.element.createElement,
	registerBlockType = wp.blocks.registerBlockType,
	InnerBlocks = wp.blockEditor.InnerBlocks;

registerBlockType( 'wporg/wporg-gutenberg-link', {
	title: 'Demo Link',
    description: 'Create a link for the demo page.',
	icon: 'link',
	category: 'text',

	edit: function ( props ) {
		if ( ! window.location.pathname.includes( 'wp-admin' ) ) {
			var blockEditorData = wp.data.select( 'core/block-editor' );
			var innerHtml = blockEditorData.getBlock( props.clientId ).innerBlocks[ 0 ].originalContent;

			return el( 'div', { className: props.className, dangerouslySetInnerHTML: { __html: innerHtml } } );
		}
		return el(
            'div',
            { className: props.className },
            el( InnerBlocks, {
    			template: [ [ 'core/paragraph' ] ],
    			templateLock: 'all',
		    } 
        ) );
	},

	save: function ( props ) {
		return el( 'div', {}, el( InnerBlocks.Content ) );
	},
} );
