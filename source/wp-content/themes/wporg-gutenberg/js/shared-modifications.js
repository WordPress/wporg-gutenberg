function addTransform( settings, name ) {
    if( name !== 'core/buttons') {
        return settings;
    }

    if( ! settings.transforms.to ) {
        settings.transforms.to = [];
    }

    settings.transforms.to.push(
        {
            type: 'block',
            blocks: [ 'wporg/wporg-gutenberg-button' ],
            transform: ( attributes, innerBlocks ) => {
                let blocks = [];

                for( var i = 0; i < innerBlocks.length; i++ ) {
                    blocks.push( wp.blocks.createBlock(
                        'wporg/wporg-gutenberg-button',
                        attributes,
                        innerBlocks
                    ) )
                }
                return blocks;
            },
        }
    )

    return settings;
}

wp.hooks.addFilter(
    'blocks.registerBlockType',
    'wporg-gutenberg/core-buttons',
    addTransform
);
