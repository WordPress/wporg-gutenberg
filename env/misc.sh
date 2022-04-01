#!/bin/bash

wp theme activate wporg-gutenberg

wp rewrite structure '/%postname%/'
wp rewrite flush
