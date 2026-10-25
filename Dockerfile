FROM node:22-bookworm-slim AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ARG PUBLIC_MEDIA_ORIGIN=http://localhost:8080
ENV VITE_API_DOMAIN="" VITE_MEDIA_DOMAIN=${PUBLIC_MEDIA_ORIGIN}
RUN npm run build:prod

FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /build
COPY backend/ backend/
COPY --from=frontend /build/frontend/dist/ frontend/dist/
RUN mvn -B -ntp -f backend/pom.xml -Pprod -DskipTests \
    -Dskip.npm=true -Dskip.installnodenpm=true package

FROM eclipse-temurin:21-jre-noble AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 protube \
    && useradd --uid 10001 --gid 10001 --no-create-home protube
WORKDIR /app
COPY --from=backend /build/backend/target/protube-back-0.0.1-SNAPSHOT.jar protube.jar
COPY --chmod=755 deploy/app-entrypoint.sh /app/entrypoint.sh
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/app/entrypoint.sh"]
