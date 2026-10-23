/**
 * Openverse in place of the Media Library, so visitors can try media blocks with license-free images.
 */

var el = wp.element.createElement;
var Fragment = wp.element.Fragment;
var useCallback = wp.element.useCallback;
var useEffect = wp.element.useEffect;
var useState = wp.element.useState;
var createInterpolateElement = wp.element.createInterpolateElement;
var useDebounce = wp.compose.useDebounce;
var Button = wp.components.Button;
var Modal = wp.components.Modal;
var Notice = wp.components.Notice;
var SearchControl = wp.components.SearchControl;
var Spinner = wp.components.Spinner;
var __ = wp.i18n.__;

/**
 * Results per page; Openverse caps anonymous requests at 20.
 *
 * @type {number}
 */
var PER_PAGE = 20;

/**
 * Returns the editor's Openverse media category, which queries the Openverse API.
 *
 * @return {Object|undefined} The media category, unless Openverse is disabled.
 */
function getOpenverseCategory() {
	var categories = wp.data.select( 'core/block-editor' ).getSettings().inserterMediaCategories || [];

	return categories.find( function ( category ) {
		return 'openverse' === category.name;
	} );
}

/**
 * Whether a media request accepts images.
 *
 * @param {string[]|undefined} allowedTypes Allowed media types or mime types.
 * @return {boolean} Whether images are allowed.
 */
function allowsImages( allowedTypes ) {
	if ( ! allowedTypes || ! allowedTypes.length ) {
		return true;
	}

	return allowedTypes.some( function ( type ) {
		return 'image' === type || 0 === type.indexOf( 'image/' );
	} );
}

/**
 * Maps an Openverse result to the media object blocks expect from MediaUpload.
 *
 * @param {Object} item Openverse result, as returned by the media category.
 * @return {Object} Media object.
 */
function toMedia( item ) {
	return {
		url: item.url,
		caption: item.caption,
		type: 'image',
	};
}

/**
 * Modal to search Openverse and pick one or more images.
 *
 * @param {Object}   props
 * @param {Object}   props.category Openverse media category.
 * @param {boolean}  props.multiple Whether several images can be picked.
 * @param {Function} props.onSelect Receives the picked media object(s).
 * @param {Function} props.onClose  Closes the modal.
 * @return {Element} The modal.
 */
function OpenverseModal( props ) {
	var [ search, setSearch ] = useState( '' );
	var [ query, setQuery ] = useState( '' );
	var [ page, setPage ] = useState( 1 );
	var [ items, setItems ] = useState( [] );
	var [ selected, setSelected ] = useState( [] );
	var [ hasMore, setHasMore ] = useState( false );
	var [ isLoading, setIsLoading ] = useState( true );
	var [ hasError, setHasError ] = useState( false );

	var startSearch = useDebounce(
		useCallback( function ( value ) {
			setQuery( value );
			setPage( 1 );
		}, [] ),
		500
	);

	useEffect(
		function () {
			var isCurrent = true;
			var args = { per_page: PER_PAGE, page: page };
			if ( query ) {
				args.search = query;
			}

			setIsLoading( true );
			props.category
				.fetch( args )
				.then( function ( results ) {
					if ( ! isCurrent ) {
						return;
					}
					setItems( function ( previous ) {
						return 1 === page ? results : previous.concat( results );
					} );
					setHasMore( results.length === PER_PAGE );
					setHasError( false );
				} )
				.catch( function () {
					if ( isCurrent ) {
						setHasError( true );
					}
				} )
				.finally( function () {
					if ( isCurrent ) {
						setIsLoading( false );
					}
				} );

			return function () {
				isCurrent = false;
			};
		},
		[ props.category, query, page ]
	);

	/**
	 * Selects or deselects an image; single-select replaces the selection.
	 *
	 * @param {Object} item Openverse result.
	 */
	function toggle( item ) {
		setSelected( function ( current ) {
			var isSelected = -1 !== current.indexOf( item );
			if ( ! props.multiple ) {
				return isSelected ? [] : [ item ];
			}
			return isSelected
				? current.filter( function ( other ) {
						return other !== item;
				  } )
				: current.concat( item );
		} );
	}

	/**
	 * Hands the selection to the block and closes the modal.
	 */
	function commit() {
		var media = selected.map( toMedia );
		props.onSelect( props.multiple ? media : media[ 0 ] );
		props.onClose();
	}

	return el(
		Modal,
		{
			className: 'wporg-openverse',
			title: __( 'Openverse', 'wporg' ),
			size: 'large',
			onRequestClose: props.onClose,
		},
		el(
			'p',
			{ className: 'wporg-openverse__intro' },
			createInterpolateElement( __( 'License-free images from <a>Openverse</a>.', 'wporg' ), {
				a: el( 'a', { href: 'https://openverse.org', target: '_blank', rel: 'noopener noreferrer' } ),
			} )
		),
		el( SearchControl, {
			__nextHasNoMarginBottom: true,
			label: __( 'Search Openverse', 'wporg' ),
			value: search,
			onChange: function ( value ) {
				setSearch( value );
				startSearch( value );
			},
		} ),
		hasError &&
			el(
				Notice,
				{ status: 'error', isDismissible: false },
				__( 'Openverse could not be reached. Please try again.', 'wporg' )
			),
		el(
			'div',
			{ className: 'wporg-openverse__grid' },
			items.map( function ( item ) {
				var isSelected = -1 !== selected.indexOf( item );
				return el(
					Button,
					{
						key: item.sourceId,
						className: 'wporg-openverse__item' + ( isSelected ? ' is-selected' : '' ),
						label: item.title,
						'aria-pressed': isSelected,
						onClick: function () {
							toggle( item );
						},
					},
					el( 'img', { src: item.previewUrl, alt: '', loading: 'lazy' } )
				);
			} )
		),
		isLoading && el( Spinner ),
		! isLoading && ! hasError && ! items.length && el( 'p', null, __( 'No images found.', 'wporg' ) ),
		el(
			'div',
			{ className: 'wporg-openverse__footer' },
			hasMore &&
				! isLoading &&
				el(
					Button,
					{
						__next40pxDefaultSize: true,
						variant: 'secondary',
						onClick: function () {
							setPage( page + 1 );
						},
					},
					__( 'Load more', 'wporg' )
				),
			el(
				Button,
				{
					__next40pxDefaultSize: true,
					variant: 'primary',
					disabled: ! selected.length,
					accessibleWhenDisabled: true,
					onClick: commit,
				},
				__( 'Select', 'wporg' )
			)
		)
	);
}

/**
 * Replaces the Media Library (wp.media) with an Openverse picker, mirroring the Pattern Directory.
 *
 * Image requests only: other media types get no library button, leaving upload and insert-from-URL.
 *
 * @param {Object} props MediaUpload props.
 * @return {Element|null} The trigger and modal.
 */
function OpenverseMediaUpload( props ) {
	var [ isOpen, setIsOpen ] = useState( false );
	var category = getOpenverseCategory();

	if ( ! category || ! allowsImages( props.allowedTypes ) ) {
		return null;
	}

	return el(
		Fragment,
		null,
		props.render( {
			open: function () {
				setIsOpen( true );
			},
		} ),
		isOpen &&
			el( OpenverseModal, {
				category: category,
				multiple: !! props.multiple,
				onSelect: props.onSelect,
				onClose: function () {
					setIsOpen( false );
				},
			} )
	);
}

wp.hooks.addFilter( 'editor.MediaUpload', 'wporg-gutenberg/openverse-media-upload', function () {
	return OpenverseMediaUpload;
}, 100 );

// The library buttons now open Openverse, so name them after it.
wp.hooks.addFilter( 'i18n.gettext_default', 'wporg-gutenberg/openverse-labels', function ( translation, text ) {
	if ( 'Media Library' === text ) {
		return __( 'Openverse', 'wporg' );
	}
	if ( 'Open Media Library' === text ) {
		return __( 'Search Openverse', 'wporg' );
	}
	return translation;
} );
