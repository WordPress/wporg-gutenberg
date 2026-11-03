// Classic scripts share the global scope, so keep these bindings out of it.
( () => {
	const { createElement: el } = wp.element;
	const { registerBlockType } = wp.blocks;
	const { InnerBlocks, useBlockProps } = wp.blockEditor;
	const isAdmin = window.location.pathname.includes( 'wp-admin' );

	/**
	 * Renders the block in the editor.
	 *
	 * @param {Object} props          Block edit props.
	 * @param {string} props.clientId The block's client ID.
	 * @return {Element} The block's editor markup.
	 */
	const Edit = ( { clientId } ) => {
		const blockProps = useBlockProps();

		if ( ! isAdmin ) {
			const blockEditorData = wp.data.select( 'core/block-editor' );
			const innerHtml = blockEditorData.getBlock( clientId ).innerBlocks[ 0 ].originalContent;

			return el( 'div', {
				...blockProps,
				dangerouslySetInnerHTML: { __html: innerHtml },
			} );
		}
		return el(
			'div',
			blockProps,
			el( InnerBlocks, {
				template: [ [ 'core/button' ] ],
				templateLock: 'all',
			} )
		);
	};

	registerBlockType( 'wporg/wporg-gutenberg-button', {
		apiVersion: 3,
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

		supports: {
			inserter: isAdmin,
		},

		edit: Edit,

		save() {
			return el( 'div', useBlockProps.save( { className: 'wp-block-buttons' } ), el( InnerBlocks.Content ) );
		},
	} );
} )();
