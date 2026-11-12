<?php
/**
 * Hreflang alternates for the Gutenberg page.
 *
 * Mirrors hreflang_link_attributes() in the wporg-main-2022 theme, which outputs
 * the same alternates on the rest of WordPress.org.
 *
 * @package Gutenbergtheme
 */

declare( strict_types = 1 );

namespace WordPressdotorg\Theme\Gutenberg;

/**
 * Outputs a hreflang link for every locale site that has the Gutenberg page.
 *
 * @link https://support.google.com/webmasters/answer/189077?hl=en Use hreflang for language and regional URLs.
 *
 * @return void
 */
function hreflang_link_attributes(): void {
	if ( ! defined( 'GLOTPRESS_LOCALES_PATH' ) && 'local' !== wp_get_environment_type() ) {
		return;
	}

	// A REST request that calls `wp_head` never expects these.
	if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
		return;
	}

	wp_cache_add_global_groups( array( 'locale-associations' ) );

	// Google doesn't support these languages and reports errors for them.
	$unsupported_languages = array(
		'arq',
		'art',
		'art-xemoji',
		'art-pirate',
		'pirate',
		'ary',
		'ast',
		'az-ir',
		'azb',
		'bal',
		'bcc',
		'bho',
		'brx',
		'dsb',
		'ff-sn',
		'fon',
		'frp',
		'fuc',
		'fur',
		'gax',
		'haz',
		'hsb',
		'ido',
		'io',
		'kaa',
		'kab',
		'li',
		'li-nl',
		'lij',
		'lmo',
		'mai',
		'me',
		'me-me',
		'mfe',
		'nqo',
		'pap-aw',
		'pap-cw',
		'pcd',
		'pcm',
		'rhg',
		'rup',
		'sah',
		'sc-it',
		'scn',
		'skr',
		'srd',
		'syr',
		'szl',
		'tah',
		'twd',
		'ty-tj',
		'tzm',
		'vec',
		'zgh',
	);

	$sites = wp_cache_get( 'local-sites', 'locale-associations' );

	// WARNING: wporg-main-2022 and the theme directory share this cache key, so the list must keep the same shape.
	if ( false === $sites ) {
		global $wpdb;

		if ( 'local' === wp_get_environment_type() ) {
			$sites = array();
		} else {
			$sites = $wpdb->get_results( 'SELECT locale, subdomain FROM wporg_locales', OBJECT_K );
			if ( ! $sites ) {
				return;
			}

			require_once GLOTPRESS_LOCALES_PATH;

			foreach ( $sites as $key => $site ) {
				$gp_locale = \GP_Locales::by_field( 'wp_locale', $site->locale );
				if ( ! $gp_locale ) {
					unset( $sites[ $key ] );
					continue;
				}

				// Skip non-existing subdomains, e.g. 'de_CH_informal'.
				if ( false !== strpos( $site->subdomain, '_' ) ) {
					unset( $sites[ $key ] );
					continue;
				}

				if ( in_array( $gp_locale->slug, $unsupported_languages, true ) ) {
					unset( $sites[ $key ] );
					continue;
				}

				$hreflang = false;

				// Google only supports ISO 639-1 codes.
				if ( isset( $gp_locale->lang_code_iso_639_1 ) && isset( $gp_locale->country_code ) ) {
					$hreflang = $gp_locale->lang_code_iso_639_1 . '-' . $gp_locale->country_code;
				} elseif ( isset( $gp_locale->lang_code_iso_639_1 ) ) {
					$hreflang = $gp_locale->lang_code_iso_639_1;
				} elseif ( isset( $gp_locale->lang_code_iso_639_2 ) ) {
					$hreflang = $gp_locale->lang_code_iso_639_2;
				} elseif ( isset( $gp_locale->lang_code_iso_639_3 ) ) {
					$hreflang = $gp_locale->lang_code_iso_639_3;
				}

				if ( $hreflang ) {
					$sites[ $key ]->hreflang = strtolower( $hreflang );
				} else {
					unset( $sites[ $key ] );
				}
			}
		}

		$sites['en_US'] = (object) array(
			'locale'    => 'en_US',
			'hreflang'  => 'en',
			'subdomain' => '',
		);

		$sites['x-default'] = (object) array(
			'locale'    => 'x-default',
			'hreflang'  => 'x-default',
			'subdomain' => '',
		);

		uasort(
			$sites,
			function ( object $a, object $b ): int {
				return strcasecmp( $a->hreflang, $b->hreflang );
			}
		);

		wp_cache_set( 'local-sites', $sites, 'locale-associations' );
	}

	// The theme redirects everything but the front page, so this is the only path there is.
	$path = wp_parse_url( home_url( '/' ), PHP_URL_PATH );

	foreach ( $sites as $site ) {
		$url = sprintf(
			'https://%swordpress.org%s',
			$site->subdomain ? "{$site->subdomain}." : '',
			$path
		);

		printf(
			'<link rel="alternate" href="%s" hreflang="%s" />' . "\n",
			esc_url( $url ),
			esc_attr( $site->hreflang )
		);
	}
}
add_action( 'wp_head', __NAMESPACE__ . '\hreflang_link_attributes' );
