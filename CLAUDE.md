# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

ProTube is a university group project (course LS2, Tecnocampus): a web app where users watch and comment on videos
uploaded by themselves and other registered users. See [README.md](./README.md) for the assignment rules
(evaluation criteria, team/Agile process) and [REQUIREMENT.md](./REQUIREMENT.md) for the MVP requirements spec.

The repo is a monorepo with two independently built apps plus a Python tool:

* `backend/` — Spring Boot 3 (Java 21) REST API, built with Maven.
* `frontend/` — React 19 + TypeScript SPA, built with Vite.
* `tooling/videoGrabber/` — Python script that downloads/trims sample videos (via `yt-dlp`/`ffmpeg`) into a store
  folder, generating the `.mp4`/`.webp`/`.json` triples the backend serves.

## Commands

### Backend (`backend/`)

* Run the app: run `ProtubeBackApplication` from the IDE, or `./mvnw spring-boot:run` — requires the
  `ENV_PROTUBE_STORE_DIR` environment variable set to the absolute path of the video store folder (see
  `application.properties`). OAuth login also needs `ENV_PROTUBE_GOOGLE_CLIENT_ID` /
  `ENV_PROTUBE_GOOGLE_CLIENT_SECRET`.
* Build + run all tests: `./mvnw clean verify` (from `backend/`).
* Run a single test class: `./mvnw test -Dtest=ClassName`; a single method: `./mvnw test -Dtest=ClassName#methodName`.
* Coverage report (JaCoCo, used in CI): `./mvnw clean verify -Pcoverage`; HTML report at
  `backend/target/site/jacoco/`.
* Two Spring profiles: `dev` (default, in-memory H2, `pro_tube.load_initial_data=true`) and `prod` (H2 by default,
  PostgreSQL config commented out in `application.properties`, ready to enable).

### Frontend (`frontend/`)

* Install deps: `npm install`.
* Dev server: `npm run dev` (Vite, default port 5173).
* Build: `npm run build` (or `npm run build:prod` for a production-mode build).
* Lint: `npm run lint` / `npm run lint-fix`.
* Format: `npm run format` (Prettier).
* Tests (Jest + Testing Library, coverage on by default): `npm run test`. Run a single file with
  `npx jest path/to/File.test.tsx`.
* Env config is read via `frontend/src/utils/Env.ts` from Vite env vars `VITE_API_DOMAIN` and `VITE_MEDIA_DOMAIN`
  (backend API assumed to live at `${VITE_API_DOMAIN}/api`, media at `${VITE_MEDIA_DOMAIN}/media`).

### Video grabber (`tooling/videoGrabber/`)

* Requires Python 3, `yt-dlp`, `ffmpeg` on PATH (see README for per-OS install steps).
* Run: `python3 main.py --store={Store_Folder} --id=10 --recreate --videos={Path to video_list.txt}` — writes
  `*.mp4`/`*.webp`/`*.json` triples per video into the store folder, which the backend reads via
  `ENV_PROTUBE_STORE_DIR`.

### CI

`.github/workflows/main.yml` runs on PRs/pushes to `main`: frontend `npm ci` → `npm run build` → tests with
coverage → lint, then backend `./mvnw clean verify -Pcoverage`, uploading both coverage reports as artifacts. Keep
changes green against this pipeline before merging.

## Architecture notes

* Backend follows a conventional Spring layering: `controller/` (REST endpoints under `/api/...`) →
  `services/` (business logic) → (persistence layer to be added per NFR-01 in REQUIREMENT.md — H2/in-memory is
  explicitly a placeholder, not the final datastore). `configuration/` holds Spring config (e.g. `MvcConfig`
  serves stored media under `/media/**`, matching `spring.mvc.static-path-pattern`).
* The store directory (`ENV_PROTUBE_STORE_DIR`) is the single source of truth for video files/metadata shared
  between the video grabber tool and the backend — don't hardcode paths, read them through
  `pro_tube.store.dir` / the equivalent service.
* Frontend is a minimal Vite/React SPA (no router yet): `App.tsx` composes hooks (`useAllVideos.ts`) that call the
  backend API through `Env.ts`'s `API_BASE_URL`. Components live in `src/components/`, colocated with their tests
  under `__tests__/` or as `*.test.tsx`.
* `REQUIREMENT.md` is the authoritative, Agile-formatted breakdown (epics/user stories/NFRs) of the MVP feature
  list in `README.md`'s "MVP" section — check it before implementing a feature to see acceptance criteria and
  priority.

## AI usage policy (project rule)

Per `README.md`'s "Usage of AI" section and `REQUIREMENT.md` NFR-06/NFR-07: AI configuration must be team-reviewed
and committed to the repo (this file), and every prompt used to generate code/architecture/etc. must be preserved
in the `prompts/` folder at the repo root — reuse an existing approved prompt for a task type it already covers
instead of writing an ad hoc one, and add new prompts there (with team approval) rather than only running them
locally.
