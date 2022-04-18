#!/bin/bash

root=$( dirname $( wp config path ) )
content=$(cat "${root}/env/gutenberg-content.txt")

# Install parent theme
wp theme install blockbase

# Activate our local theme
wp theme activate wporg-gutenberg

# Delete all the content
wp site empty --yes

# Add in default page and configure it as the home page
page_id=`wp post create --post_type=page --post_status='publish' --post_name='test' --post_title='Gutenberg Home' --post_content="$content" --porcelain`
wp option update show_on_front 'page'
wp option update page_on_front $page_id

