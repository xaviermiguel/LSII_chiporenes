#!/bin/sh
set -eu

password_file="${ENV_PROTUBE_DB_PASS_FILE:-/run/protube-secrets/db_password}"
if [ ! -r "$password_file" ] || [ ! -s "$password_file" ]; then
    echo "Database password file is missing, empty or unreadable" >&2
    exit 1
fi
ENV_PROTUBE_DB_PASS="$(cat "$password_file")"
export ENV_PROTUBE_DB_PASS
exec java -jar /app/protube.jar "$@"
