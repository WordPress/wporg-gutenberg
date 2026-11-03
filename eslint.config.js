/**
 * ESLint config: the @wordpress/scripts defaults, plus this project's globals and text domain.
 */

/**
 * External dependencies
 */
const wpScriptsConfig = require( '@wordpress/scripts/config/eslint.config.cjs' );

module.exports = [
	...wpScriptsConfig,
	{
		languageOptions: {
			globals: {
				wp: 'readonly',
				_wpLoadBlockEditor: 'readonly',
			},
		},
		rules: {
			'@wordpress/i18n-text-domain': [ 'error', { allowedTextDomain: [ 'wporg' ] } ],
		},
	},
];
