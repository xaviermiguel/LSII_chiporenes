sudo su - postgres
psql
postgres=# CREATE USER mydbuser WITH PASSWORD 'mypasswd' CREATEROLE CREATEDB;
psql -U mydbuser -h 127.0.0.1 -d postgres

CREATE DATABASE mydatabase;
