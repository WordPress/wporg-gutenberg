var el = wp.element.createElement,
	registerBlockType = wp.blocks.registerBlockType,
	InnerBlocks = wp.blockEditor.InnerBlocks;

registerBlockType( 'wporg/wporg-gutenberg-button', {
	title: 'Demo Button',
	icon: 'button',
	category: 'layout',

	attributes: {
		url: {
			source: 'attribute',
			selector: 'a',
			attribute: 'href',
		},
		title: {
			source: 'attribute',
			selector: 'a',
			attribute: 'title',
		},
		text: {
			source: 'text',
			selector: 'a',
		},
	},

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
			template: [ [ 'core/button' ] ],
			templateLock: 'all',
		} ));
	},

	save: function ( props ) {
		return el( 'div', { className: 'wp-block-buttons' }, el( InnerBlocks.Content ) );
	},
} );
