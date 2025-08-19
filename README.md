# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/75af5bec-f58d-4753-8801-38ac5d327eb5

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/75af5bec-f58d-4753-8801-38ac5d327eb5) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/75af5bec-f58d-4753-8801-38ac5d327eb5) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## End-to-End (E2E) Testing with Playwright

We use Playwright for smoke-level E2E tests across critical UI areas (Bot Control, Dashboard metrics, Backtests).

### Local setup

```bash
npm install
npm run build
npm run e2e:install   # installs Playwright browsers

# Optional: skip websocket-dependent tests if backend is unavailable
$env:SKIP_WS_TESTS='1'  # PowerShell
# export SKIP_WS_TESTS=1  # bash/zsh

npm run e2e:run
```

Useful scripts:

- `npm run e2e:ui` – run tests in headed mode with the Playwright UI
- `npm run e2e:report` – open the last HTML report

### Base URL and server

Playwright runs `npm run build` and `npm run preview` under the hood (see `playwright.config.ts`). Override with `PLAYWRIGHT_BASE_URL` or `PORT` if needed.

### CI

GitHub Actions workflow `.github/workflows/e2e.yml` runs the E2E suite on push/PR to `main` with:

- Node 20, Playwright browsers
- `SKIP_WS_TESTS=1`
- Artifacts: HTML report and `test-results` (traces, videos, screenshots)

## Backend development and tests (docker-compose)

For local backend development and tests, we use a dev-only override file that mounts live code and sets the Python path:

- `docker-compose.override.yml` mounts `./backend` to `/app` and sets `PYTHONPATH=/app` so the container sees your latest backend code and tests immediately.
- To (re)create the backend service with the override:

```bash
docker compose up -d --force-recreate backend
```

To run the backend test suite inside the container in CI-style (base compose only, no override), set `PYTHONPATH` explicitly:

```bash
docker compose -f docker-compose.yml exec -T -e PYTHONPATH=/app -w /app backend sh -lc "pytest -vv -s"
```
