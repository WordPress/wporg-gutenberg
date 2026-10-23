/**
 * Openverse in place of the Media Library, so visitors can try media blocks with license-free images.
 */

// Classic scripts share the global scope, so keep these bindings out of it.
( () => {
	const { createElement: el, createInterpolateElement, Fragment, useCallback, useEffect, useState } = wp.element;
	const { Button, Modal, Notice, SearchControl, Spinner } = wp.components;
	const { useDebounce } = wp.compose;
	const { __ } = wp.i18n;

	/**
	 * Results per page; Openverse caps anonymous requests at 20.
	 *
	 * @type {number}
	 */
	const PER_PAGE = 20;

	/**
	 * Returns the editor's Openverse media category, which queries the Openverse API.
	 *
	 * @return {Object|undefined} The media category, unless Openverse is disabled.
	 */
	const getOpenverseCategory = () =>
		wp.data
			.select( 'core/block-editor' )
			.getSettings()
			.inserterMediaCategories?.find( ( { name } ) => 'openverse' === name );

	/**
	 * Whether a media request accepts images.
	 *
	 * @param {string[]|undefined} allowedTypes Allowed media types or mime types.
	 * @return {boolean} Whether images are allowed.
	 */
	const allowsImages = ( allowedTypes ) =>
		! allowedTypes?.length || allowedTypes.some( ( type ) => 'image' === type || type.startsWith( 'image/' ) );

	/**
	 * Maps an Openverse result to the media object blocks expect from MediaUpload.
	 *
	 * @param {Object} item         Openverse result, as returned by the media category.
	 * @param {string} item.url     Image URL.
	 * @param {string} item.caption Attribution caption (HTML).
	 * @return {Object} Media object.
	 */
	const toMedia = ( { url, caption } ) => ( { url, caption, type: 'image' } );

	/**
	 * Modal to search Openverse and pick one or more images.
	 *
	 * @param {Object}                           props
	 * @param {Object}                           props.category Openverse media category.
	 * @param {boolean}                          props.multiple Whether several images can be picked.
	 * @param {(media: Object|Object[]) => void} props.onSelect Receives the picked media object(s).
	 * @param {() => void}                       props.onClose  Closes the modal.
	 * @return {Element} The modal.
	 */
	const OpenverseModal = ( { category, multiple, onSelect, onClose } ) => {
		const [ search, setSearch ] = useState( '' );
		const [ query, setQuery ] = useState( '' );
		const [ page, setPage ] = useState( 1 );
		const [ items, setItems ] = useState( [] );
		const [ selected, setSelected ] = useState( [] );
		const [ hasMore, setHasMore ] = useState( false );
		const [ isLoading, setIsLoading ] = useState( true );
		const [ hasError, setHasError ] = useState( false );

		const startSearch = useDebounce(
			useCallback( ( value ) => {
				setQuery( value );
				setPage( 1 );
			}, [] ),
			500
		);

		useEffect( () => {
			let isCurrent = true;

			// Don't leave the previous search's results clickable while a new one loads.
			if ( 1 === page ) {
				setItems( [] );
			}
			setIsLoading( true );
			category
				.fetch( { per_page: PER_PAGE, page, ...( query && { search: query } ) } )
				.then( ( results ) => {
					if ( ! isCurrent ) {
						return;
					}
					setItems( ( previous ) => ( 1 === page ? results : [ ...previous, ...results ] ) );
					setHasMore( results.length === PER_PAGE );
					setHasError( false );
				} )
				.catch( () => isCurrent && setHasError( true ) )
				.finally( () => isCurrent && setIsLoading( false ) );

			return () => {
				isCurrent = false;
			};
		}, [ category, query, page ] );

		/**
		 * Selects or deselects an image; single-select replaces the selection.
		 *
		 * @param {Object} item Openverse result.
		 */
		const toggle = ( item ) =>
			setSelected( ( current ) => {
				const isSelected = current.includes( item );
				if ( ! multiple ) {
					return isSelected ? [] : [ item ];
				}
				return isSelected ? current.filter( ( other ) => other !== item ) : [ ...current, item ];
			} );

		/**
		 * Hands the selection to the block and closes the modal.
		 */
		const commit = () => {
			const media = selected.map( toMedia );
			onSelect( multiple ? media : media[ 0 ] );
			onClose();
		};

		return el(
			Modal,
			{
				className: 'wporg-openverse',
				title: __( 'Openverse', 'wporg' ),
				size: 'large',
				onRequestClose: onClose,
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
				onChange: ( value ) => {
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
				items.map( ( item ) => {
					const isSelected = selected.includes( item );
					return el(
						Button,
						{
							key: item.sourceId,
							className: `wporg-openverse__item${ isSelected ? ' is-selected' : '' }`,
							label: item.title,
							'aria-pressed': isSelected,
							onClick: () => toggle( item ),
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
						{ __next40pxDefaultSize: true, variant: 'secondary', onClick: () => setPage( page + 1 ) },
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
	};

	/**
	 * Replaces the Media Library (wp.media) with an Openverse picker, mirroring the Pattern Directory.
	 *
	 * Image requests only: other media types get no library button, leaving upload and insert-from-URL.
	 *
	 * @param {Object}                                props              MediaUpload props.
	 * @param {string[]}                              props.allowedTypes Allowed media types or mime types.
	 * @param {boolean}                               props.multiple     Whether several images can be picked.
	 * @param {(media: Object|Object[]) => void}      props.onSelect     Receives the picked media object(s).
	 * @param {(args: {open: () => void}) => Element} props.render       Renders the button that opens the picker.
	 * @return {Element|null} The trigger and modal.
	 */
	const OpenverseMediaUpload = ( { allowedTypes, multiple, onSelect, render } ) => {
		const [ isOpen, setIsOpen ] = useState( false );
		const category = getOpenverseCategory();

		if ( ! category || ! allowsImages( allowedTypes ) ) {
			return null;
		}

		return el(
			Fragment,
			null,
			render( { open: () => setIsOpen( true ) } ),
			isOpen &&
				el( OpenverseModal, {
					category,
					multiple: !! multiple,
					onSelect,
					onClose: () => setIsOpen( false ),
				} )
		);
	};

	wp.hooks.addFilter(
		'editor.MediaUpload',
		'wporg-gutenberg/openverse-media-upload',
		() => OpenverseMediaUpload,
		100
	);

	/**
	 * Labels for the library buttons, which now open Openverse.
	 *
	 * @type {Map<string, string>}
	 */
	const LABELS = new Map( [
		[ 'Media Library', __( 'Openverse', 'wporg' ) ],
		[ 'Open Media Library', __( 'Search Openverse', 'wporg' ) ],
	] );

	wp.hooks.addFilter(
		'i18n.gettext_default',
		'wporg-gutenberg/openverse-labels',
		( translation, text ) => LABELS.get( text ) ?? translation
	);
} )();
