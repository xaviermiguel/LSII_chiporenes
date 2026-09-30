# Development guide

How to set up, run, test and build ProTube locally. For the assignment rules see [README.md](./README.md), and for
the MVP spec see [REQUIREMENT.md](./REQUIREMENT.md).

## Repository layout

| Folder                   | What it is                                                                 |
|--------------------------|----------------------------------------------------------------------------|
| `backend/`               | Spring Boot 3.3 REST API (Java 21, Maven). Serves `/api/**` and `/media/**` |
| `frontend/`              | React 19 + TypeScript SPA (Vite)                                           |
| `tooling/videoGrabber/`  | Python script that downloads sample videos into the video store folder     |
| `resources/`             | Images for the docs and `video_list.txt` (input for the video grabber)     |
| `.run/`                  | Shared IntelliJ IDEA run configurations                                    |
| `prompts/`               | Approved AI prompts (see the "Usage of AI" section of the README)          |

## Prerequisites

* **Java 21** (JDK; CI uses Amazon Corretto 21).
* **Maven 3.9+**. The Maven wrapper (`mvnw`) is **not** committed; either use your local `mvn`, or generate the
  wrapper once inside `backend/` with `mvn -N wrapper:wrapper` (CI does the equivalent). The commands below use
  `mvn`; swap in `./mvnw` if you generated it.
* **Node.js 22** and npm (CI uses Node 22; the production Maven build downloads Node v22.12.0 on its own).
* **Python 3, `yt-dlp` and `ffmpeg`** — only if you need to generate the sample videos.

## 1. Generate the video store

The backend reads videos from a *store* folder: one `.mp4` / `.webp` / `.json` triple per video, produced by the
video grabber. Do this once before running the backend.

```bash
cd tooling/videoGrabber
pip install -r dependencies.txt
python3 main.py --store=/absolute/path/to/videos --id=10 --videos=../../resources/video_list.txt
```

* `--id` is your group id (used to pick the set of videos).
* `--recreate` wipes and regenerates an existing store folder (without it, the script exits if the folder exists).
* Use `python` instead of `python3` on Windows if that's how Python is installed.

## 2. Environment variables

| Variable                           | Needed for              | Description                                                                                      |
|------------------------------------|-------------------------|--------------------------------------------------------------------------------------------------|
| `ENV_PROTUBE_STORE_DIR`            | always                  | Absolute path of the video store folder. **End it with a path separator** (`/` or `\`) — it is used as a `file:` prefix to serve `/media/**`. |
| `ENV_PROTUBE_GOOGLE_CLIENT_ID`     | Google OAuth login      | Google OAuth client id                                                                           |
| `ENV_PROTUBE_GOOGLE_CLIENT_SECRET` | Google OAuth login      | Google OAuth client secret                                                                       |
| `ENV_PROTUBE_DB_USER`              | `prod` profile          | Database user (use `sa` with the default H2 datasource)                                          |
| `ENV_PROTUBE_DB_PWD`               | `prod` profile          | Database password (empty with the default H2 datasource)                                         |
| `ENV_PROTUBE_DB`                   | `prod` + PostgreSQL     | PostgreSQL database name (see [Using PostgreSQL](#using-postgresql))                              |

Never commit real secrets. Set them in your shell, your OS, or your (local, uncommitted) IDE run configuration.

```bash
# Linux / macOS
export ENV_PROTUBE_STORE_DIR=/home/me/protube/videos/
```

```powershell
# Windows PowerShell (current session)
$env:ENV_PROTUBE_STORE_DIR = "D:\code\videos\"
```

## 3. Development mode

In development the backend and frontend run as two separate processes:

```
Browser ──► Vite dev server (http://localhost:5173) ──fetch──► Spring Boot (http://localhost:8080/api, /media)
```

### Backend

```bash
cd backend
mvn spring-boot:run
```

* Starts on **http://localhost:8080** with the `dev` profile (active by default through the Maven `dev` profile).
* `dev` uses an in-memory H2 database and loads initial data (`pro_tube.load_initial_data=true`). All data is lost
  on restart.
* From IntelliJ you can instead use the shared **ProtubeBackApplication** run configuration (`.run/`) — edit its
  environment variables to point to your own store folder.
* CORS is open for `/api/**` and `/auth/**`, so the Vite dev server can call the API directly.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

* Starts on **http://localhost:5173** with hot reload (or use the **frontend [DEV]** IntelliJ run configuration).
* API and media URLs come from `frontend/.env.development`:
  ```
  VITE_API_DOMAIN=http://localhost:8080
  VITE_MEDIA_DOMAIN=http://localhost:8080
  ```
  and are read through `src/utils/Env.ts` (`API_BASE_URL = ${VITE_API_DOMAIN}/api`,
  `MEDIA_BASE_URL = ${VITE_MEDIA_DOMAIN}/media`). To override locally without touching the committed file, create
  `frontend/.env.development.local`.

## 4. Tests, lint and formatting

### Backend

```bash
cd backend
mvn clean verify                          # build + all tests
mvn test -Dtest=ClassName                 # one test class
mvn test -Dtest=ClassName#methodName      # one test method
mvn clean verify -Pcoverage               # tests + JaCoCo report → target/site/jacoco/index.html
```

### Frontend

```bash
cd frontend
npm run test                              # Jest + Testing Library, coverage → coverage/
npx jest path/to/File.test.tsx            # a single test file
npm run lint                              # ESLint
npm run lint-fix                          # ESLint with autofix
npm run format                            # Prettier
```

The MVP requires **more than 50% coverage** on both apps.

### CI

`.github/workflows/main.yml` runs on every PR and push to `main`:

1. Frontend: `npm ci` → `npm run build` → `npm run test` → `npm run lint`
2. Backend: `./mvnw clean verify -Pcoverage`
3. Uploads both coverage reports as build artifacts.

Before opening a PR, run the same steps locally so the pipeline stays green.

## 5. Production mode

In production the frontend is bundled **inside** the backend jar and everything is served by Spring Boot from a
single origin (http://localhost:8080). The Maven `prod` profile:

1. Downloads Node/npm into `backend/target/`, runs `npm install` and `npm run build:prod` in `frontend/`.
2. Copies `frontend/dist/` into the jar's `static/` folder.
3. Activates the Spring `prod` profile (`pro_tube.load_initial_data=false`, `ddl-auto=update`).

`frontend/.env.production` leaves `VITE_API_DOMAIN`/`VITE_MEDIA_DOMAIN` empty, so the built SPA calls the API with
relative URLs (`/api`, `/media`) on the same host.

### Run directly with Maven

```bash
cd backend
mvn -Pprod spring-boot:run
```

(IntelliJ: the shared **Production** run configuration does the same.)

### Build and run the jar

```bash
cd backend
mvn -Pprod clean package
java -jar target/protube-back-0.0.1-SNAPSHOT.jar
```

(IntelliJ: the **Create jar** run configuration runs `package` with the `prod` profile.) Remember that
`ENV_PROTUBE_STORE_DIR`, `ENV_PROTUBE_DB_USER` and `ENV_PROTUBE_DB_PWD` must be set in the environment where the jar
runs.

To only preview the production frontend bundle, without the backend: `cd frontend && npm run build:prod && npm run preview`.

### Using PostgreSQL

The `prod` profile still points to an in-memory H2 database, which is only a placeholder — the MVP requires a real
database (NFR-01 in [REQUIREMENT.md](./REQUIREMENT.md)). The PostgreSQL driver is already a dependency. To switch:

1. Start a PostgreSQL server (e.g. `docker run -d --name protube-db -p 5432:5432 -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=protube postgres:16`).
2. In `backend/src/main/resources/application.properties`, in the `prod` section, uncomment the PostgreSQL
   `spring.datasource.url` line and remove the H2 one.
3. Set `ENV_PROTUBE_DB` (e.g. `protube`), `ENV_PROTUBE_DB_USER` (e.g. `postgres`) and `ENV_PROTUBE_DB_PWD`.

## 6. Workflow reminders

* `main` is protected: work in a branch and open a Pull Request; it needs at least one approval and all Copilot
  review comments resolved before merging.
* Use [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/#summary) and reference the task.
* If AI generated part of a change, mark it in the commit message and reference the prompt from `prompts/` that was
  used (see [prompts/README.md](./prompts/README.md)).
* Setting up the GitHub repository: [docs/GITHUB_SETUP.md](./docs/GITHUB_SETUP.md).

## Troubleshooting

* **`Could not resolve placeholder 'ENV_PROTUBE_STORE_DIR'`** (or `ENV_PROTUBE_DB_USER`, ...): the variable isn't
  set in the environment of the process running the app. IDEs usually need a restart to pick up new OS-level
  variables.
* **Videos list loads but thumbnails/videos 404**: check that `ENV_PROTUBE_STORE_DIR` ends with a path separator and
  points to the folder containing the `.mp4`/`.webp` files.
* **Frontend can't reach the API in dev**: make sure the backend is running on port 8080, or adjust
  `VITE_API_DOMAIN` in `.env.development.local`.
* **Port already in use**: change `server.port` (backend) or run `npm run dev -- --port 5174` (frontend).
