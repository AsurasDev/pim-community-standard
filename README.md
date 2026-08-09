Akeneo PIM Community Standard Edition
=====================================

Welcome to Akeneo PIM.

This repository is used to create a new PIM project based on Akeneo PIM.

If you want to contribute to the Akeneo PIM (and we will be pleased if you do!), you can fork the repository https://github.com/akeneo/pim-community-dev and submit a pull request.

Installation instructions
-------------------------

### Development Installation with Docker

## Requirements
 - Docker 19+
 - docker-compose >= 1.24
 - make

## Creating a project and starting the PIM
The following steps will install Akeneo PIM in the current directory (must be empty) and launch it from there:

```bash
$ docker run -u www-data -v $(pwd):/srv/pim -w /srv/pim --rm akeneo/pim-php-dev:8.3 \
    php /usr/local/bin/composer create-project --prefer-dist \
    akeneo/pim-community-standard /srv/pim "v2026.3"
```
```
$ make

```

The PIM will be available on http://localhost:8080/, with `admin/admin` as default credentials.

To shutdown your PIM: `make down`

### Installation without Docker


```bash
$ php /usr/local/bin/composer create-project --prefer-dist akeneo/pim-community-standard /srv/pim "dev-master@dev"
```

You will need to change the `.env` file to configure the access to your MySQL and ES server.

Once done, you can run:

```
$ NO_DOCKER=true make
```

For more details, please follow https://docs.akeneo.com/master/install_pim

Upgrade instructions
--------------------

To upgrade Akeneo PIM to a newer version, please follow:
https://docs.akeneo.com/master/migrate_pim/index.html

Changelog
---------
You can check out the changelog files in https://github.com/akeneo/pim-community-dev.

Railway deployment
------------------

This fork contains a production-oriented, single-container runtime for Railway.
It builds the Akeneo 2026.3 backend and frontend, serves the application with
Nginx and PHP-FPM, and runs the Symfony Messenger worker under Supervisor.

The Railway project needs three services:

* this repository as the `akeneo` service, with a persistent volume mounted at
  `/srv/pim/var`;
* MySQL `8.0.34`, with a volume mounted at `/var/lib/mysql`;
* Elasticsearch `8.17.0`, with a volume mounted at
  `/usr/share/elasticsearch/data` and `node.store.allow_mmap=false`.

The application entrypoint waits for both dependencies and only runs the
destructive Akeneo installer when its completed-install marker is absent.
Subsequent deployments preserve the database and uploaded files.

Akeneo 2026.3's generic `pim:install` command defaults to a fixture path that
does not exist in the Standard distribution. The runtime therefore follows
the production target from Akeneo's own `std-build/Makefile` and passes the
packaged `minimal` catalog explicitly to `pim:installer:db`.

Railway mounts volumes as root. Elasticsearch must run with
`RAILWAY_RUN_UID=0` and a start command that fixes ownership before dropping
privileges again:

```bash
bash -lc 'chown -R elasticsearch:root /usr/share/elasticsearch/data && exec runuser -u elasticsearch -- /usr/local/bin/docker-entrypoint.sh eswrapper'
```
