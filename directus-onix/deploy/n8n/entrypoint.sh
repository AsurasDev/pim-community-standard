#!/bin/sh
set -e

FOLDER="${N8N_USER_FOLDER:-/home/node/.n8n}"
mkdir -p "$FOLDER"
chown -R node:node "$FOLDER"

# La imagen base puede pasar "n8n" como CMD; Railway puede no pasar nada.
[ "$1" = "n8n" ] && shift
[ "$#" -eq 0 ] && set -- start

if command -v su-exec >/dev/null 2>&1; then
  exec su-exec node n8n "$@"
elif command -v gosu >/dev/null 2>&1; then
  exec gosu node n8n "$@"
else
  # BusyBox trae `setpriv` sin --reuid, así que se descarta a propósito.
  exec su node -s /bin/sh -c "n8n $*"
fi
