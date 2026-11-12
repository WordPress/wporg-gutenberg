<?php
/**
 * Hreflang alternates for the Gutenberg page.
 *
 * @package Gutenbergtheme
 */

declare( strict_types = 1 );

namespace WordPressdotorg\Theme\Gutenberg;

/**
 * Outputs a hreflang link for every locale site's copy of the Gutenberg page.
 *
 * @return void
 */
function hreflang_link_attributes(): void {
	// Part of the WordPress.org SEO mu-plugin, which a local environment doesn't have.
	if ( ! function_exists( '\WordPressdotorg\SEO\Hreflang\the_links' ) ) {
		return;
	}

	// The theme redirects everything but the front page, so this is the only path there is.
	\WordPressdotorg\SEO\Hreflang\the_links( wp_parse_url( home_url( '/' ), PHP_URL_PATH ) );
}
add_action( 'wp_head', __NAMESPACE__ . '\hreflang_link_attributes' );
