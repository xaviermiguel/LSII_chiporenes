#!/bin/sh
set -eu
umask 077

password_file=/run/protube-secrets/db_password
if [ -s "$password_file" ]; then
    if [ -n "${BOOTSTRAP_DB_PASSWORD:-}" ] && [ "$(cat "$password_file")" != "$BOOTSTRAP_DB_PASSWORD" ]; then
        echo "The supplied password differs from the existing credential volume; no password was changed" >&2
        exit 1
    fi
else
    if [ -n "${BOOTSTRAP_DB_PASSWORD:-}" ]; then
        printf '%s' "$BOOTSTRAP_DB_PASSWORD" > "$password_file"
    else
        od -An -N32 -tx1 /dev/urandom | tr -d ' \n' > "$password_file"
    fi
fi
# Only the application UID and the database entrypoint (root) need to read this file.
chown 10001:10001 "$password_file"
chmod 400 "$password_file"
