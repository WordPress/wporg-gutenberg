# WordPress.org Gutenberg Theme
## Development

### Prerequisites

* Docker
* Node/npm
* Yarn
* Composer

### Setup

1. Set up repo dependencies: `yarn run initial-setup`
1. Start up and provision the environment: `yarn run env:setup`
1. Visit site at `localhost:8888`
1. Log in with username `admin` and password `password`

### Environment management

These must be run in the project's root folder, _not_ in theme/plugin subfolders.

* Stop the environment: `yarn run env:stop` or `yarn run wp-env stop`
* Restart the environment: `yarn run env` or `yarn run wp-env start`
* Reset the dev site's content: `yarn run env:reset`
* SSH into docker container: `docker exec -it {container ID} /bin/bash`. You can get the ID from `docker ps`.

### Manual environment updates

Comment out `'activePostLock' => esc_attr( implode( ':', $active_post_lock ) )` in `functions.php@241`. That line is needed for .org but not running it locally. It will cause an error.


### Sync/Deploy

The built files are committed to `dotorg.svn` so they can be deployed. They aren't synced to `meta.svn`, since they're already open in GitHub.

To sync these to `dotorg.svn`, run `bin/sync/gutenberg.sh` on a w.org sandbox. Once they're committed, you can deploy like normal.
