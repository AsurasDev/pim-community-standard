#!/bin/sh
set -eu

PORT="${PORT:-8080}"
APP_DATABASE_PORT="${APP_DATABASE_PORT:-3306}"
AKENEO_ADMIN_USERNAME="${AKENEO_ADMIN_USERNAME:-admin}"
AKENEO_ADMIN_EMAIL="${AKENEO_ADMIN_EMAIL:-admin@example.com}"

required_variables="APP_DATABASE_HOST APP_DATABASE_NAME APP_DATABASE_USER APP_DATABASE_PASSWORD APP_INDEX_HOSTS APP_SECRET AKENEO_PIM_URL AKENEO_ADMIN_PASSWORD"
for variable_name in $required_variables; do
    eval "variable_value=\${$variable_name:-}"
    if [ -z "$variable_value" ]; then
        echo "Missing required variable: $variable_name" >&2
        exit 1
    fi
done

sed "s/__PORT__/$PORT/g" /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

mkdir -p \
    /run/php \
    /run/nginx \
    /srv/pim/var/cache \
    /srv/pim/var/logs \
    /srv/pim/var/file_storage/catalog \
    /srv/pim/var/file_storage/jobs \
    /srv/pim/var/file_storage/archive \
    /srv/pim/var/file_storage/category \
    /srv/pim/var/file_storage/catalogs_mapping
chown -R www-data:www-data /srv/pim/var /run/php

export APP_DATABASE_PORT
export MYSQL_PWD="$APP_DATABASE_PASSWORD"

echo "Waiting for MySQL at ${APP_DATABASE_HOST}:${APP_DATABASE_PORT}..."
attempt=0
until mysqladmin ping \
    --host="$APP_DATABASE_HOST" \
    --port="$APP_DATABASE_PORT" \
    --user="$APP_DATABASE_USER" \
    --silent; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 60 ]; then
        echo "MySQL did not become ready in time." >&2
        exit 1
    fi
    sleep 2
done

elasticsearch_url="${APP_INDEX_HOSTS%%,*}"
case "$elasticsearch_url" in
    http://*|https://*) ;;
    *) elasticsearch_url="http://$elasticsearch_url" ;;
esac

echo "Waiting for Elasticsearch at ${elasticsearch_url}..."
attempt=0
until curl --fail --silent --show-error \
    "${elasticsearch_url%/}/_cluster/health?wait_for_status=yellow&timeout=5s" \
    > /dev/null; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 60 ]; then
        echo "Elasticsearch did not become ready in time." >&2
        exit 1
    fi
    sleep 2
done

configuration_tables="$(mysql \
    --host="$APP_DATABASE_HOST" \
    --port="$APP_DATABASE_PORT" \
    --user="$APP_DATABASE_USER" \
    --batch --skip-column-names \
    --execute="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${APP_DATABASE_NAME}' AND table_name = 'pim_configuration';")"

install_markers=0
if [ "$configuration_tables" != "0" ]; then
    install_markers="$(mysql \
        --host="$APP_DATABASE_HOST" \
        --port="$APP_DATABASE_PORT" \
        --user="$APP_DATABASE_USER" \
        --database="$APP_DATABASE_NAME" \
        --batch --skip-column-names \
        --execute="SELECT COUNT(*) FROM pim_configuration WHERE code = 'install_data';")"
fi

if [ "$install_markers" = "0" ]; then
    echo "Installing Akeneo database and search indexes..."
    su -s /bin/sh www-data -c \
        "APP_ENV=prod php bin/console pim:installer:check-requirements --no-interaction --env=prod"
    su -s /bin/sh www-data -c \
        "APP_ENV=prod php bin/console pim:installer:db --doNotDropDatabase --catalog vendor/akeneo/pim-community-dev/src/Akeneo/Platform/Bundle/InstallerBundle/Resources/fixtures/minimal --no-interaction --env=prod"
    su -s /bin/sh www-data -c \
        "APP_ENV=prod php bin/console pim:installer:assets --symlink --clean --no-interaction --env=prod"

    existing_admin="$(mysql \
        --host="$APP_DATABASE_HOST" \
        --port="$APP_DATABASE_PORT" \
        --user="$APP_DATABASE_USER" \
        --database="$APP_DATABASE_NAME" \
        --batch --skip-column-names \
        --execute="SELECT COUNT(*) FROM oro_user WHERE username = '${AKENEO_ADMIN_USERNAME}';")"

    if [ "$existing_admin" = "0" ]; then
        su -s /bin/sh www-data -c \
            "APP_ENV=prod php bin/console pim:user:create '${AKENEO_ADMIN_USERNAME}' '${AKENEO_ADMIN_PASSWORD}' '${AKENEO_ADMIN_EMAIL}' Akeneo Admin en_US --admin --no-interaction --env=prod"
    else
        echo "Admin user ${AKENEO_ADMIN_USERNAME} already exists; keeping its current password."
    fi
else
    echo "Completed Akeneo installation detected; skipping destructive installation."
fi

su -s /bin/sh www-data -c \
    "APP_ENV=prod php bin/console cache:warmup --no-debug --env=prod"

echo "Starting Akeneo on port ${PORT}."
exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf
