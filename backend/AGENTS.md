# Backend

Draft proposal pending team and professor review; not final.

Spring Boot REST API using Java 21 and Maven.

- Keep HTTP handling in controllers and business logic in services.
- Read paths and credentials from configuration; do not hardcode them.
- Preserve existing API contracts unless the task requires changing them.
- Test changed behavior using existing Spring Boot test conventions.
- H2 is a development placeholder; delivery requires a persistent database
  other than H2.

## Checks

Run from `backend/`:
- `mvn clean verify -Pcoverage`
- For a specific test: `mvn test -Dtest=ClassName`
