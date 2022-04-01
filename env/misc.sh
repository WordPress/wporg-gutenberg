#!/bin/bash

wp theme activate wporg-gutenberg

wp rewrite structure '/%year%/%monthnum%/%postname%/'
wp rewrite flush
