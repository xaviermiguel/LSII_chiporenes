sudo su - postgres
psql
postgres=# CREATE USER mydbuser WITH PASSWORD 'mypasswd' CREATEROLE CREATEDB;
psql -U mydbuser -h 127.0.0.1 -d postgres

CREATE DATABASE mydatabase;

## Estándar visual de ProTube

La [guía del equipo](../docs/VISUAL_STANDARD.md) documenta los tokens, las clases compartidas y las comprobaciones visuales. Ejecuta `npm run test:contrast` al cambiar la paleta.
