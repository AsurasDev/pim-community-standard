FROM node:18-bullseye AS node-runtime

FROM akeneo/pim-php-dev:8.3 AS build

USER root
WORKDIR /srv/pim

ENV APP_ENV=prod \
    APP_DEBUG=0 \
    COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_MEMORY_LIMIT=4G \
    COREPACK_ENABLE_PROJECT_SPEC=0 \
    NODE_OPTIONS=--max-old-space-size=4096 \
    PHP_CONF_MEMORY_LIMIT=4G

# Reuse the Node runtime from Akeneo's supported Node 18 generation without
# installing a second apt repository in the build container.
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=node-runtime /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -sf ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -sf ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
    && ln -sf ../lib/node_modules/corepack/dist/corepack.js /usr/local/bin/corepack \
    && corepack enable \
    && node --version \
    && yarn --version

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader

COPY . ./

RUN yarn install --non-interactive --network-timeout 1200000 \
    && APP_ENV=prod php bin/console cache:warmup --no-debug \
    && rm -rf public/bundles public/js public/css public/dist \
    && APP_ENV=prod php bin/console pim:installer:assets --symlink --clean --no-debug \
    && yarn packages:build \
    && yarn update-extensions \
    && yarn webpack \
    && yarn less \
    && rm -rf node_modules

FROM akeneo/pim-php-dev:8.3 AS runtime

USER root
WORKDIR /srv/pim

ENV APP_ENV=prod \
    APP_DEBUG=0 \
    PHP_CONF_MEMORY_LIMIT=1G \
    PHP_CONF_MAX_EXECUTION_TIME=300 \
    XDEBUG_MODE=off

RUN apt-get update \
    && apt-get install --yes --no-install-recommends nginx supervisor \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default

COPY --from=build --chown=www-data:www-data /srv/pim /srv/pim
COPY docker/nginx.conf.template /etc/nginx/nginx.conf.template
COPY docker/supervisord.conf /etc/supervisor/conf.d/akeneo.conf
COPY docker/entrypoint.sh /usr/local/bin/akeneo-entrypoint

RUN chmod +x /usr/local/bin/akeneo-entrypoint \
    && mkdir -p /run/php /run/nginx /srv/pim/var \
    && chown -R www-data:www-data /srv/pim/var /run/php

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/akeneo-entrypoint"]
