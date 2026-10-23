/**
 * Prettier config: the @wordpress/scripts defaults, with the wider line length used across WordPress.org.
 */

/**
 * External dependencies
 */
const defaultConfig = require( '@wordpress/scripts/config/.prettierrc.js' );

module.exports = {
	...defaultConfig,
	printWidth: 115,
};
