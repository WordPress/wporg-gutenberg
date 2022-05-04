var el = wp.element.createElement,
	registerBlockType = wp.blocks.registerBlockType,
	InnerBlocks = wp.blockEditor.InnerBlocks,
	isAdmin = window.location.pathname.includes( 'wp-admin' );

registerBlockType( 'wporg/wporg-gutenberg-link', {
	title: 'Demo Link',
	description: 'Create a link for the demo page.',
	icon: 'button',
	category: 'text',

	supports: {
		inserter: isAdmin,
	},

	edit( props ) {
		if ( ! isAdmin ) {
			const blockEditorData = wp.data.select( 'core/block-editor' );
			const innerHtml = blockEditorData.getBlock( props.clientId ).innerBlocks[ 0 ].originalContent;

			return el( 'div', {
				className: props.className,
				dangerouslySetInnerHTML: { __html: innerHtml },
			} );
		}
		return el(
			'div',
			{ className: props.className },
			el( InnerBlocks, {
				template: [ [ 'core/paragraph' ] ],
				templateLock: 'all',
			} )
		);
	},

	save() {
		return el( 'div', {}, el( InnerBlocks.Content ) );
	},
} );
