function addTransform( settings, name ) {
    if( name !== 'core/buttons') {
        return settings;
    }

    if(!settings.transforms.to) {
        settings.transforms.to = [];
    }
    
    settings.transforms.to.push(
        {
            type: 'block',
            blocks: [ 'wporg/wporg-gutenberg-button' ],
            transform: ( attributes, innerBlocks ) => {
                return wp.blocks.createBlock(
                    'wporg/wporg-gutenberg-button',
                    attributes,
                    innerBlocks
                );
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
