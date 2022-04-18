<?php
/**
 * gutenbergtheme functions and definitions
 *
 * @link https://developer.wordpress.org/themes/basics/theme-functions/
 *
 * @package Gutenbergtheme
 */

if ( ! defined( 'WPORGPATH' ) ) {
	define( 'WPORGPATH', get_theme_file_path( '/inc/' ) );
}


add_action(
	'enqueue_block_assets',
	function () {
		wp_enqueue_script( 'editor-modifications', get_template_directory_uri() . '/js/editor-modifications.js', array( 'wp-blocks', 'wp-edit-post' ), null );
		wp_enqueue_script( 'button-readonly', get_template_directory_uri() . '/js/button-readonly.js', array( 'wp-blocks', 'wp-edit-post', 'wp-block-editor' ), null );
	}
);

/**
 * Prevent errors resulting from change to Gutenberg plugin in 4.9 that adds call to
 * `get_current_screen()`.
 */
if ( ! function_exists( 'get_current_screen' ) && ! is_admin() && ! wp_doing_cron() && ! wp_doing_ajax() && ! ( defined( 'WP_CLI' ) && WP_CLI ) && ! ( defined( 'XMLRPC_REQUEST' ) && XMLRPC_REQUEST ) ) {
	function get_current_screen() {
		return null;
	}
}

/**
 * This function was removed from the Gutenberg plugin in v5.3.
 */
if ( ! function_exists( 'gutenberg_editor_scripts_and_styles' ) ) {
	/**
	 * Scripts & Styles.
	 *
	 * Enqueues the needed scripts and styles when visiting the top-level page of
	 * the Gutenberg editor.
	 *
	 * @since 0.1.0
	 *
	 * @param string $hook Screen name.
	 */
	function gutenberg_editor_scripts_and_styles( $hook ) {
		global $wp_meta_boxes;

		// Enqueue heartbeat separately as an "optional" dependency of the editor.
		// Heartbeat is used for automatic nonce refreshing, but some hosts choose
		// to disable it outright.
		wp_enqueue_script( 'heartbeat' );

		wp_enqueue_script( 'wp-edit-post' );
		wp_enqueue_script( 'wp-format-library' );
		wp_enqueue_style( 'wp-format-library' );

		global $post;

		// Set initial title to empty string for auto draft for duration of edit.
		// Otherwise, title defaults to and displays as "Auto Draft".
		$is_new_post = 'auto-draft' === $post->post_status;

		// Set the post type name.
		$post_type        = get_post_type( $post );
		$post_type_object = get_post_type_object( $post_type );
		$rest_base        = ! empty( $post_type_object->rest_base ) ? $post_type_object->rest_base : $post_type_object->name;

		$preload_paths = array(
			'/',
			'/wp/v2/types?context=edit',
			'/wp/v2/taxonomies?per_page=-1&context=edit',
			'/wp/v2/themes?status=active',
			sprintf( '/wp/v2/%s/%s?context=edit', $rest_base, $post->ID ),
			sprintf( '/wp/v2/types/%s?context=edit', $post_type ),
			sprintf( '/wp/v2/users/me?post_type=%s&context=edit', $post_type ),
			array( '/wp/v2/media', 'OPTIONS' ),
			array( '/wp/v2/blocks', 'OPTIONS' ),
		);

		/**
		 * Preload common data by specifying an array of REST API paths that will be preloaded.
		 *
		 * Filters the array of paths that will be preloaded.
		 *
		 * @param array $preload_paths Array of paths to preload
		 * @param object $post         The post resource data.
		 */
		$preload_paths = apply_filters( 'block_editor_preload_paths', $preload_paths, $post );

		// Ensure the global $post remains the same after
		// API data is preloaded. Because API preloading
		// can call the_content and other filters, callbacks
		// can unexpectedly modify $post resulting in issues
		// like https://github.com/WordPress/gutenberg/issues/7468.
		$backup_global_post = $post;

		$preload_data = array_reduce(
			$preload_paths,
			'rest_preload_api_request',
			array()
		);

		// Restore the global $post as it was before API preloading.
		$post = $backup_global_post;

		wp_add_inline_script(
			'wp-api-fetch',
			sprintf( 'wp.apiFetch.use( wp.apiFetch.createPreloadingMiddleware( %s ) );', wp_json_encode( $preload_data ) ),
			'after'
		);

		wp_add_inline_script(
			'wp-blocks',
			sprintf( 'wp.blocks.setCategories( %s );', wp_json_encode( get_block_categories( $post ) ) ),
			'after'
		);

		// Assign initial edits, if applicable. These are not initially assigned
		// to the persisted post, but should be included in its save payload.
		if ( $is_new_post ) {
			// Override "(Auto Draft)" new post default title with empty string,
			// or filtered value.
			$initial_edits = array(
				'title'   => $post->post_title,
				'content' => $post->post_content,
				'excerpt' => $post->post_excerpt,
			);
		} else {
			$initial_edits = null;
		}

		// Preload server-registered block schemas.
		wp_add_inline_script(
			'wp-blocks',
			'wp.blocks.unstable__bootstrapServerSideBlockDefinitions(' . json_encode( get_block_editor_server_block_settings() ) . ');'
		);

		// Get admin url for handling meta boxes.
		$meta_box_url = admin_url( 'post.php' );
		$meta_box_url = add_query_arg(
			array(
				'post'            => $post->ID,
				'action'          => 'edit',
				'meta-box-loader' => true,
				'_wpnonce'        => wp_create_nonce( 'meta-box-loader' ),
			),
			$meta_box_url
		);
		wp_add_inline_script( 'wp-editor', sprintf( 'var _wpMetaBoxUrl = %s;', wp_json_encode( $meta_box_url ) ), 'before' );

		// Initialize the editor.
		$align_wide    = get_theme_support( 'align-wide' );
		$color_palette = current( (array) get_theme_support( 'editor-color-palette' ) );
		$font_sizes    = current( (array) get_theme_support( 'editor-font-sizes' ) );

		/**
		 * Filters the allowed block types for the editor, defaulting to true (all
		 * block types supported).
		 *
		 * @param bool|array $allowed_block_types Array of block type slugs, or
		 *                                        boolean to enable/disable all.
		 * @param object $post                    The post resource data.
		 */
		$allowed_block_types = apply_filters( 'allowed_block_types', true, $post );

		// Get all available templates for the post/page attributes meta-box.
		// The "Default template" array element should only be added if the array is
		// not empty so we do not trigger the template select element without any options
		// besides the default value.
		$available_templates = wp_get_theme()->get_page_templates( get_post( $post->ID ) );
		$available_templates = ! empty( $available_templates ) ? array_merge(
			array(
				'' => apply_filters( 'default_page_template_title', __( 'Default template', 'gutenberg' ), 'rest-api' ),
			),
			$available_templates
		) : $available_templates;

		// Media settings.
		$max_upload_size = wp_max_upload_size();
		if ( ! $max_upload_size ) {
			$max_upload_size = 0;
		}

		// Editor Styles.
		global $editor_styles;
		$styles = array();

		/* Translators: Use this to specify the CSS font family for the default font */
		$locale_font_family = esc_html_x( 'Noto Serif', 'CSS Font Family for Editor Font', 'gutenberg' );
		$styles[]           = array(
			'css' => "body { font-family: '$locale_font_family' }",
		);

		if ( $editor_styles && current_theme_supports( 'editor-styles' ) ) {
			foreach ( $editor_styles as $style ) {
				if ( filter_var( $style, FILTER_VALIDATE_URL ) ) {
					$styles[] = array(
						'css' => file_get_contents( $style ),
					);
				} else {
					$file = get_theme_file_path( $style );
					if ( file_exists( $file ) ) {
						$styles[] = array(
							'css'     => file_get_contents( $file ),
							'baseURL' => get_theme_file_uri( $style ),
						);
					}
				}
			}
		}

		// Lock settings.
		$user_id = wp_check_post_lock( $post->ID );
		if ( $user_id ) {
			/**
			 * Filters whether to show the post locked dialog.
			 *
			 * Returning a falsey value to the filter will short-circuit displaying the dialog.
			 *
			 * @since 3.6.0
			 *
			 * @param bool         $display Whether to display the dialog. Default true.
			 * @param WP_Post      $post    Post object.
			 * @param WP_User|bool $user    The user id currently editing the post.
			 */
			if ( apply_filters( 'show_post_locked_dialog', true, $post, $user_id ) ) {
				$locked = true;
			} else {
				$locked = false;
			}

			$user_details = null;
			if ( $locked ) {
				$user         = get_userdata( $user_id );
				$user_details = array(
					'name' => $user->display_name,
				);
				$avatar       = get_avatar( $user_id, 64 );
				if ( $avatar ) {
					if ( preg_match( "|src='([^']+)'|", $avatar, $matches ) ) {
						$user_details['avatar'] = $matches[1];
					}
				}
			}

			$lock_details = array(
				'isLocked' => $locked,
				'user'     => $user_details,
			);
		} else {

			// Lock the post.
			$active_post_lock = wp_set_post_lock( $post->ID );
			$lock_details     = array(
				'isLocked'       => false,
				'activePostLock' => esc_attr( implode( ':', $active_post_lock ) ),
			);
		}

		$editor_settings = array(
			'alignWide'              => $align_wide,
			'availableTemplates'     => $available_templates,
			'allowedBlockTypes'      => $allowed_block_types,
			'disableCustomColors'    => get_theme_support( 'disable-custom-colors' ),
			'disableCustomFontSizes' => get_theme_support( 'disable-custom-font-sizes' ),
			'disablePostFormats'     => ! current_theme_supports( 'post-formats' ),
			'titlePlaceholder'       => apply_filters( 'enter_title_here', __( 'Add title', 'gutenberg' ), $post ),
			'bodyPlaceholder'        => apply_filters( 'write_your_story', __( 'Start writing or type / to choose a block', 'gutenberg' ), $post ),
			'isRTL'                  => is_rtl(),
			'autosaveInterval'       => 10,
			'maxUploadFileSize'      => $max_upload_size,
			'allowedMimeTypes'       => get_allowed_mime_types(),
			'styles'                 => $styles,
			'imageSizes'             => gutenberg_get_available_image_sizes(),
			'richEditingEnabled'     => user_can_richedit(),

			// Ideally, we'd remove this and rely on a REST API endpoint.
			'postLock'               => $lock_details,
			'postLockUtils'          => array(
				'nonce'       => wp_create_nonce( 'lock-post_' . $post->ID ),
				'unlockNonce' => wp_create_nonce( 'update-post_' . $post->ID ),
				'ajaxUrl'     => admin_url( 'admin-ajax.php' ),
			),

			// Whether or not to load the 'postcustom' meta box is stored as a user meta
			// field so that we're not always loading its assets.
			'enableCustomFields'     => (bool) get_user_meta( get_current_user_id(), 'enable_custom_fields', true ),
		);

		$post_autosave = gutenberg_get_autosave_newer_than_post_save( $post );
		if ( $post_autosave ) {
			$editor_settings['autosave'] = array(
				'editLink' => get_edit_post_link( $post_autosave->ID ),
			);
		}

		if ( false !== $color_palette ) {
			$editor_settings['colors'] = $color_palette;
		}

		if ( false !== $font_sizes ) {
			$editor_settings['fontSizes'] = $font_sizes;
		}

		if ( ! empty( $post_type_object->template ) ) {
			$editor_settings['template']     = $post_type_object->template;
			$editor_settings['templateLock'] = ! empty( $post_type_object->template_lock ) ? $post_type_object->template_lock : false;
		}

		$current_screen  = get_current_screen();
		$core_meta_boxes = array();

		// Make sure the current screen is set as well as the normal core metaboxes.
		if ( isset( $current_screen->id ) && isset( $wp_meta_boxes[ $current_screen->id ]['normal']['core'] ) ) {
			$core_meta_boxes = $wp_meta_boxes[ $current_screen->id ]['normal']['core'];
		}

		// Check if the Custom Fields meta box has been removed at some point.
		if ( ! isset( $core_meta_boxes['postcustom'] ) || ! $core_meta_boxes['postcustom'] ) {
			unset( $editor_settings['enableCustomFields'] );
		}

		$editor_context  = new WP_Block_Editor_Context( array( 'post' => $post ) );
		$editor_settings = get_block_editor_settings( $editor_settings, $editor_context );

		$init_script = <<<JS
( function() {
	window._wpLoadBlockEditor = new Promise( function( resolve ) {
		wp.domReady( function() {
			resolve( wp.editPost.initializeEditor( 'editor', "%s", %d, %s, %s ) );
		} );
	} );
} )();
JS;

		$script = sprintf(
			$init_script,
			$post->post_type,
			$post->ID,
			wp_json_encode( $editor_settings ),
			wp_json_encode( $initial_edits )
		);
		wp_add_inline_script( 'wp-edit-post', $script );

		/**
		 * Scripts
		 */
		wp_enqueue_media(
			array(
				'post' => $post->ID,
			)
		);
		wp_tinymce_inline_scripts();
		wp_enqueue_editor();

		/**
		 * Styles
		 */
		wp_enqueue_style( 'wp-edit-post' );

		/**
		 * Fires after block assets have been enqueued for the editing interface.
		 *
		 * Call `add_action` on any hook before 'admin_enqueue_scripts'.
		 *
		 * In the function call you supply, simply use `wp_enqueue_script` and
		 * `wp_enqueue_style` to add your functionality to the Gutenberg editor.
		 *
		 * @since 0.4.0
		 */
		do_action( 'enqueue_block_editor_assets' );
	}
}


/**
 * This function was removed from the Gutenberg plugin in v5.4.
 */
if ( ! function_exists( 'gutenberg_get_available_image_sizes' ) ) {
	/**
	 * Retrieve The available image sizes for a post
	 *
	 * @return array
	 */
	function gutenberg_get_available_image_sizes() {
		$size_names = apply_filters(
			'image_size_names_choose',
			array(
				'thumbnail' => __( 'Thumbnail', 'gutenberg' ),
				'medium'    => __( 'Medium', 'gutenberg' ),
				'large'     => __( 'Large', 'gutenberg' ),
				'full'      => __( 'Full Size', 'gutenberg' ),
			)
		);
		$all_sizes  = array();
		foreach ( $size_names as $size_slug => $size_name ) {
			$all_sizes[] = array(
				'slug' => $size_slug,
				'name' => $size_name,
			);
		}
		return $all_sizes;
	}
} // /function_exists()

/**
 * This function was removed from the Gutenberg plugin in v5.4.
 */
if ( ! function_exists( 'gutenberg_get_autosave_newer_than_post_save' ) ) {
	/**
	 * Retrieve a stored autosave that is newer than the post save.
	 *
	 * Deletes autosaves that are older than the post save.
	 *
	 * @param  WP_Post $post Post object.
	 * @return WP_Post|boolean The post autosave. False if none found.
	 */
	function gutenberg_get_autosave_newer_than_post_save( $post ) {
		// Add autosave data if it is newer and changed.
		$autosave = wp_get_post_autosave( $post->ID );
		if ( ! $autosave ) {
			return false;
		}
		// Check if the autosave is newer than the current post.
		if (
		mysql2date( 'U', $autosave->post_modified_gmt, false ) > mysql2date( 'U', $post->post_modified_gmt, false )
		) {
			return $autosave;
		}
		// If the autosave isn't newer, remove it.
		wp_delete_post_revision( $autosave->ID );
		return false;
	}
} // /function_exists()

add_action(
	'template_redirect',
	function() {
		if ( ! is_page( 'test' ) ) {
			return;
		}

		// Hide the admin bar, it overlaps with Gutenberg
		show_admin_bar( false );

		add_action(
			'wp_enqueue_scripts',
			function() {
				wp_enqueue_script( 'postbox', admin_url( 'js/postbox.min.js' ), array( 'jquery-ui-sortable' ), false, 1 );
				wp_enqueue_style( 'dashicons' );
				wp_enqueue_style( 'common' );
				wp_enqueue_style( 'forms' );
				wp_enqueue_style( 'dashboard' );
				wp_enqueue_style( 'media' );
				wp_enqueue_style( 'admin-menu' );
				wp_enqueue_style( 'admin-bar' );
				wp_enqueue_style( 'nav-menus' );
				wp_enqueue_style( 'l10n' );
				wp_enqueue_style( 'buttons' );

				$post = get_post();

				wp_add_inline_script(
					'wp-api-fetch',
					sprintf(
						'wp.apiFetch.use( wp.apiFetch.createPreloadingMiddleware( %s ) );',
						wp_json_encode(
							array(
								'/wp/v2/pages/' . $post->ID . '?context=edit' => array(
									'body' => array(
										'id'             => $post->ID,
										'title'          => array( 'raw' => $post->post_title ),
										'content'        => array(
											'block_format' => 1,
											'raw'          => $post->post_content,
										),
										'excerpt'        => array( 'raw' => '' ),
										'date'           => '',
										'date_gmt'       => '',
										'modified'       => '',
										'modified_gmt'   => '',
										'link'           => home_url( '/' ),
										'guid'           => array(),
										'parent'         => 0,
										'menu_order'     => 0,
										'author'         => 0,
										'featured_media' => 0,
										'comment_status' => 'closed',
										'ping_status'    => 'closed',
										'template'       => '',
										'meta'           => array(),
										'_links'         => array(),
										'type'           => 'page',
										'status'         => 'draft',
										'slug'           => '',
										'generated_slug' => '',
										'permalink_template' => home_url( '/' ),
									),
								),
							)
						)
					),
					'after'
				);
			},
			11
		);

		add_action(
			'wp_enqueue_scripts',
			function( $hook ) {
				// Gutenberg requires the post-locking functions defined within:
				// See `show_post_locked_dialog` and `get_post_metadata` filters below.
				include_once ABSPATH . 'wp-admin/includes/post.php';

				gutenberg_editor_scripts_and_styles( $hook );
			}
		);

		add_action(
			'enqueue_block_editor_assets',
			function() {
				wp_enqueue_script( 'button-readonly', get_template_directory_uri() . '/js/button-readonly.js', array( 'wp-blocks', 'wp-element' ), null );
				wp_enqueue_style( 'custom-editor-styles', get_template_directory_uri() . '/editor-styles.css', false, '20220406' );
			}
		);

		// Disable post locking dialogue.
		add_filter( 'show_post_locked_dialog', '__return_false' );

		// Everyone can richedit! This avoids a case where a page can be cached where a user can't richedit.
		$GLOBALS['wp_rich_edit'] = true;
		add_filter( 'user_can_richedit', '__return_true', 1000 );

		// Homepage is always locked by @wordpressdotorg
		// This prevents other logged-in users taking a lock of the post on the front-end.
		add_filter(
			'get_post_metadata',
			function( $value, $post_id, $meta_key ) {
				if ( $meta_key !== '_edit_lock' ) {
					return $value;
				}

				// This filter is only added on a front-page view of the homepage for this site, no other checks are needed here.

				return time() . ':5911429'; // WordPressdotorg user ID
			},
			10,
			3
		);

		// Disable use XML-RPC
		add_filter( 'xmlrpc_enabled', '__return_false' );

		// Disable X-Pingback to header
		function disable_x_pingback( $headers ) {
			unset( $headers['X-Pingback'] );

			return $headers;
		}
		add_filter( 'wp_headers', 'disable_x_pingback' );

		function frontenberg_site_title() {
			return esc_html__( 'The new Gutenberg editing experience', 'wporg' );
		}
		add_filter( 'the_title', 'frontenberg_site_title' );
		add_filter( 'option_blogname', 'frontenberg_site_title' );

		function frontenberg_site_description() {
			return esc_html__( 'A new editing experience for WordPress is in the works, code name Gutenberg. Read more about it and test it!', 'wporg' );
		}
		add_filter( 'option_blogdescription', 'frontenberg_site_description' );

		// Disable Jetpack Blocks for now.
		add_filter( 'jetpack_gutenberg', '__return_false' );
	}
);

/**
 * Let unauthenticated users embed media in Frontenberg.
 */
function frontenberg_enable_oembed( $all_caps ) {
	if (
		0 === strpos( $_SERVER['REQUEST_URI'], '/gutenberg/wp-json/oembed/1.0/proxy' ) ||
		0 === strpos( $_SERVER['REQUEST_URI'], '/gutenberg/wp-json/gutenberg/v1/block-renderer/core/archives' ) ||
		0 === strpos( $_SERVER['REQUEST_URI'], '/gutenberg/wp-json/gutenberg/v1/block-renderer/core/latest-comments' )
	) {
		$all_caps['edit_posts'] = true;
	}

	return $all_caps;
}
add_filter( 'user_has_cap', 'frontenberg_enable_oembed' );

/**
 * Ajax handler for querying attachments for logged-out users.
 *
 * @since 3.5.0
 */
function frontenberg_wp_ajax_nopriv_query_attachments() {
	if ( 97589 !== absint( $_REQUEST['post_id'] ) ) {
		wp_send_json_error();
	}
	$query = isset( $_REQUEST['query'] ) ? (array) $_REQUEST['query'] : array();
	$keys  = array(
		's',
		'order',
		'orderby',
		'posts_per_page',
		'paged',
		'post_mime_type',
		'post_parent',
		'post__in',
		'post__not_in',
		'year',
		'monthnum',
	);
	foreach ( get_taxonomies_for_attachments( 'objects' ) as $t ) {
		if ( $t->query_var && isset( $query[ $t->query_var ] ) ) {
			$keys[] = $t->query_var;
		}
	}

	$query              = array_intersect_key( $query, array_flip( $keys ) );
	$query['post_type'] = 'attachment';
	if ( MEDIA_TRASH
		&& ! empty( $_REQUEST['query']['post_status'] )
		&& 'trash' === $_REQUEST['query']['post_status'] ) {
		$query['post_status'] = 'trash';
	} else {
		$query['post_status'] = 'inherit';
	}

	// Filter query clauses to include filenames.
	if ( isset( $query['s'] ) ) {
		add_filter( 'posts_clauses', '_filter_query_attachment_filenames' );
	}

	if ( empty( $query['post__in'] ) ) {
		$query['post__in'] = range( 97654, 97659 );
	}

	/**
	 * Filters the arguments passed to WP_Query during an Ajax
	 * call for querying attachments.
	 *
	 * @since 3.7.0
	 *
	 * @see WP_Query::parse_query()
	 *
	 * @param array $query An array of query variables.
	 */
	$query = apply_filters( 'ajax_query_attachments_args', $query );
	$query = new WP_Query( $query );

	$posts = array_map( 'wp_prepare_attachment_for_js', $query->posts );
	$posts = array_filter( $posts );

	wp_send_json_success( $posts );
}
add_action( 'wp_ajax_nopriv_query-attachments', 'frontenberg_wp_ajax_nopriv_query_attachments' );

/**
 * Removes tagline, which is used more as a description on this site.
 *
 * @param array $title {
 *     The document title parts.
 *
 *     @type string $title   Title of the viewed page.
 *     @type string $page    Optional. Page number if paginated.
 *     @type string $tagline Optional. Site description when on home page.
 *     @type string $site    Optional. Site title when not on home page.
 * }
 */
function gutenberg_title_parts( $title ) {
	unset( $title['tagline'] );

	return $title;
}
add_filter( 'document_title_parts', 'gutenberg_title_parts' );

if ( ! function_exists( 'gutenbergtheme_setup' ) ) :
	/**
	 * Sets up theme defaults and registers support for various WordPress features.
	 *
	 * Note that this function is hooked into the after_setup_theme hook, which
	 * runs before the init hook. The init hook is too late for some features, such
	 * as indicating support for post thumbnails.
	 */
	function gutenbergtheme_setup() {
		/*
		 * Make theme available for translation.
		 * Translations can be filed in the /languages/ directory.
		 * If you're building a theme based on gutenbergtheme, use a find and replace
		 * to change 'gutenbergtheme' to the name of your theme in all the template files.
		 */
		load_theme_textdomain( 'gutenbergtheme', get_template_directory() . '/languages' );

		// Add default posts and comments RSS feed links to head.
		add_theme_support( 'automatic-feed-links' );

		/*
		 * Let WordPress manage the document title.
		 * By adding theme support, we declare that this theme does not use a
		 * hard-coded <title> tag in the document head, and expect WordPress to
		 * provide it for us.
		 */
		add_theme_support( 'title-tag' );

		/*
		 * Enable support for Post Thumbnails on posts and pages.
		 *
		 * @link https://developer.wordpress.org/themes/functionality/featured-images-post-thumbnails/
		 */
		add_theme_support( 'post-thumbnails' );

		// This theme uses wp_nav_menu() in one location.
		register_nav_menus(
			array(
				'menu-1' => esc_html__( 'Primary', 'gutenbergtheme' ),
			)
		);

		/*
		 * Switch default core markup for search form, comment form, and comments
		 * to output valid HTML5.
		 */
		add_theme_support(
			'html5',
			array(
				'search-form',
				'comment-form',
				'comment-list',
				'gallery',
				'caption',
			)
		);

		add_theme_support( 'align-wide' );

		add_theme_support(
			'editor-color-palette',
			array(
				array(
					'name'  => esc_html__( 'Dark Blue', 'gutenbergtheme' ),
					'slug'  => 'dark-blue',
					'color' => '#0073aa',
				),
				array(

					'name'  => esc_html__( 'Light Blue', 'gutenbergtheme' ),
					'slug'  => 'light-blue',
					'color' => '#229fd8',
				),
				array(

					'name'  => esc_html__( 'Dark Gray', 'gutenbergtheme' ),
					'slug'  => 'dark-gray',
					'color' => '#444',
				),
				array(

					'name'  => esc_html__( 'Light Gray', 'gutenbergtheme' ),
					'slug'  => 'light-gray',
					'color' => '#eee',
				),
			)
		);
	}
endif;
add_action( 'after_setup_theme', 'gutenbergtheme_setup' );

/**
 * Set the content width in pixels, based on the theme's design and stylesheet.
 *
 * Priority 0 to make it available to lower priority callbacks.
 *
 * @global int $content_width
 */
function gutenbergtheme_content_width() {
	$GLOBALS['content_width'] = apply_filters( 'gutenbergtheme_content_width', 640 );
}
add_action( 'after_setup_theme', 'gutenbergtheme_content_width', 0 );

/**
 * Register Google Fonts
 */
function gutenbergtheme_fonts_url() {
	$fonts_url = '';

	/*
	 Translators: If there are characters in your language that are not
	 * supported by Karla, translate this to 'off'. Do not translate
	 * into your own language.
	 */
	$notoserif = esc_html_x( 'on', 'Noto Serif font: on or off', 'gutenbergtheme' );

	if ( 'off' !== $notoserif ) {
		$font_families   = array();
		$font_families[] = 'Noto Serif:400,400italic,700,700italic';

		$query_args = array(
			'family' => urlencode( implode( '|', $font_families ) ),
			'subset' => urlencode( 'latin,latin-ext' ),
		);

		$fonts_url = add_query_arg( $query_args, 'https://fonts.googleapis.com/css' );
	}

	return $fonts_url;

}

/**
 * Enqueue scripts and styles.
 */
function gutenbergtheme_scripts() {
	wp_enqueue_style( 'gutenbergtheme-style', get_stylesheet_uri(), array(), 14 );

	wp_enqueue_style( 'gutenbergtheme-fonts', gutenbergtheme_fonts_url(), array(), null );
}
add_action( 'wp_enqueue_scripts', 'gutenbergtheme_scripts' );

/**
 * Implement the Custom Header feature.
 */
require get_template_directory() . '/inc/custom-header.php';

/**
 * Custom template tags for this theme.
 */
require get_template_directory() . '/inc/template-tags.php';

/**
 * Functions which enhance the theme by hooking into WordPress.
 */
require get_template_directory() . '/inc/template-functions.php';

/**
 * Customizer additions.
 */
require get_template_directory() . '/inc/customizer.php';

/**
 * Load Jetpack compatibility file.
 */
if ( defined( 'JETPACK__VERSION' ) ) {
	require get_template_directory() . '/inc/jetpack.php';
}
