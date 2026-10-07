# AGENTS.md

Shared instructions for coding agents working on ProTube. Read this file before
making changes and follow any more specific AGENTS.md in the area being edited.

## Project overview

ProTube is a university group project for Software Laboratory II at TecnoCampus:
a web application intended to let users watch and comment on uploaded videos.
Read README.md for assignment and team rules, REQUIREMENT.md for acceptance
criteria, and DEVELOPMENT.md for development guidance. Confirm commands and
configuration against the actual source files when documentation disagrees.

- backend/: Spring Boot 3.3.3 REST API, Java 21, Maven.
- frontend/: React 19 and TypeScript SPA built with Vite 7.
- tooling/videoGrabber/: Python tool using yt-dlp, ffmpeg and ffprobe to generate
  .mp4, .webp and .json video resources.
- resources/: shared inputs, including video_list.txt.
- .github/workflows/: CI configuration.
- prompts/: team-reviewed prompts used for AI-assisted contributions.

## Working agreements

- Inspect the relevant code and configuration before editing. Do not invent
  commands, dependencies, environment variables or features.
- Preserve the existing architecture and naming conventions. Make focused
  changes and avoid unrelated rewrites or new dependencies without a task need.
- Preserve existing local changes, particularly machine-specific configuration.
- Do not edit node_modules/, build outputs or generated videos as source code.
- Do not commit secrets or hardcode machine-specific paths.
- Keep Windows and WSL paths distinct; check where a command will execute.
- Work on a feature branch, never directly on main. Submit changes through a PR
  for human review and respect repository protections.
- Diagnose failures using actual errors and logs before changing source code.

## Commands and configuration

### Backend (run commands from backend/)

- Requires Java 21 and Maven. CI uses Amazon Corretto 21.
- Run ProtubeBackApplication through the shared IntelliJ configuration in .run/.
  The backend is configured to listen on port 8080.
- Build and run tests: mvn clean verify.
- Run one test class: mvn test "-Dtest=ClassName".
- Run one test method: mvn test "-Dtest=ClassName#methodName".
- Production build: mvn -Pprod clean package. This also installs/builds the
  frontend and copies its output into the backend resources.
- The Maven Wrapper is not committed. Do not use ./mvnw or mvnw.cmd unless the
  relevant wrapper files exist in the checkout.
- JaCoCo runs in the normal test lifecycle and writes target/site/jacoco/.
  No Maven profile named coverage is defined in pom.xml.
- Maven profiles select dev (default, in-memory H2) or prod (PostgreSQL).
- ENV_PROTUBE_STORE_DIR identifies the video store. The media resource handler
  uses it as a file: location; use a directory path with a trailing separator.
- Production PostgreSQL configuration uses ENV_PROTUBE_DB_HOST,
  ENV_PROTUBE_DB, ENV_PROTUBE_DB_USER and ENV_PROTUBE_DB_PASS.
- Google OAuth properties reference ENV_PROTUBE_GOOGLE_CLIENT_ID and
  ENV_PROTUBE_GOOGLE_CLIENT_SECRET. Properties alone do not establish that
  authentication is implemented; check dependencies and code before changing it.

### Frontend (run commands from frontend/)

- CI uses Node.js 22. package.json and package-lock.json define dependencies.
- Install dependencies: npm install; use npm ci for the locked CI installation.
- Development server: npm run dev (Vite defaults to port 5173).
- Build: npm run build; production build: npm run build:prod.
- Tests: npm run test (Jest and Testing Library, with coverage).
- Run one test file: npm run test -- --runTestsByPath src/path/File.test.tsx.
  Replace the example path with an existing test file.
- Lint: npm run lint; automatic fixes: npm run lint-fix.
- Format: npm run format. It writes files across the frontend; avoid unrelated
  formatting changes when working on a focused task.
- src/utils/Env.ts constructs API and media URLs from VITE_API_DOMAIN and
  VITE_MEDIA_DOMAIN, adding /api and /media respectively.

### Video grabber

- The developer reports that videoGrabber is already configured. Preserve its
  configuration and existing video store; verify the environment only when the
  requested task involves generation or a failure.
- Inspect main.py and vars.py before running the tool. vars.py selects the
  yt-dlp, ffmpeg and ffprobe executables for the execution environment.
- The backend and the grabber share the store identified by ENV_PROTUBE_STORE_DIR.
- If generation is requested, run from tooling/videoGrabber/:
  python main.py --store="<destination>" --id=10 --videos="../../resources/video_list.txt"
  Replace the destination and group id with the actual task inputs, and use the
  Python command available in that environment.
- Do not use --recreate for routine setup or verification. It deletes files in
  the existing destination directory before regenerating resources. Use it only
  when replacement of those resources is explicitly requested.

### CI

.github/workflows/main.yml defines workflow "Pull Request CI", job
build-and-test, triggered by pushes and PRs targeting main. It installs frontend
dependencies, builds and tests the frontend, sets up Java, generates the Maven
Wrapper, builds/tests the backend, then lints the frontend and uploads coverage.

The backend CI command currently includes -Pcoverage although no such profile
exists. Treat this as a known configuration discrepancy, not a required local
flag. Do not change CI as part of an unrelated task.

## Architecture

- Backend controllers expose /api endpoints and delegate business logic to
  services/. configuration/MvcConfig serves stored files under /media/**.
- VideoService currently returns placeholder video names. Do not assume the
  store metadata or persistence features are already implemented.
- Access the store through pro_tube.store.dir rather than hardcoded paths.
- Frontend App.tsx composes components and useAllVideos.ts. API access uses
  src/utils/Env.ts. Components and their tests live under src/components/.
- Follow REQUIREMENT.md acceptance criteria when implementing new features.

## AI usage and Definition of Done

- Follow the team review and approval policy in README.md and REQUIREMENT.md
  (NFR-06/NFR-07). This configuration is a proposal until reviewed by the team.
- Preserve prompts in prompts/. Reuse approved prompts where available; new
  prompts and changes to them go through team review. Do not fabricate approval.
- AI-assisted commits must identify AI use and reference the prompt and task,
  as required by README.md. The team must understand and explain the changes.
- A completed task implements the requested behavior, preserves relevant existing
  functionality and passes applicable checks. No unrelated changes or secrets
  should be introduced; generated resources change only when required.
- Run relevant build, test and lint checks for the files changed. For documentation
  changes, check factual accuracy and the diff; application tests are only needed
  if the task affects behavior or requires them.
- Report what changed, which files changed, checks run and their results, and any
  remaining issues. If a check could not run, state that clearly.
