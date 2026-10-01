# POCOCHIC — Development Workflow & Local Setup

Complete local development instructions for all contributors and agents.

---

## Prerequisites

- **Node.js** ≥ 22 (required by npm and all POCOCHIC skills)
- **Docker** + **Docker Compose** (local services)
- **Git**

---

## 1. Package Manager: npm

All dependencies are managed with **npm**. No other package managers (yarn, pnpm, bun) are permitted.

```bash
# Install all dependencies
npm install

# Add a dependency
npm install <package>

# Add a dev dependency
npm install -D <package>

# Run scripts (defined per-package package.json)
npm run dev
npm run build
npm test
```

---

## 2. Local Services: Docker Compose

Local development requires two Docker containers: **SQLite** (via `sqlite-utils` or similar) and **MinIO** (local object storage).

### `pocochic/docker-compose.yml` (product monorepo root)

```yaml
# See actual: pocochic/docker-compose.yml (uses datasette for SQLite UI)
version: "3.8"

services:
  db:
    image: datasetteproject/datasette:latest
    container_name: pocochic-db
    ports:
      - "8080:8001"
    volumes:
      - ./data:/data
    command: datasette /data/pocochic.db --port 8001 --host 0.0.0.0
    restart: unless-stopped

  minio:
    image: minio/minio:latest
    container_name: pocochic-minio
    ports:
      - "9000:9000"    # API
      - "9001:9001"    # Console
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
    command: server /data --console-address ":9001"
    volumes:
      - minio-data:/data
    restart: unless-stopped

volumes:
  minio-data:
```

### Start / Stop

Run from the `pocochic/` product directory (or use `-f` from workspace root):

```bash
# Start all local services (from inside pocochic/)
docker compose up -d

# Or from workspace root:
# docker compose -f pocochic/docker-compose.yml --env-file pocochic/.env up -d

# Stop all local services
docker compose down

# View logs
docker compose logs -f
```

### After starting

1. **SQLite** is available at `http://localhost:8080` (or via the mounted volume at `pocochic/data/pocochic.db` from workspace root, or `./data/pocochic.db` when inside `pocochic/`).
2. **MinIO Console** is at `http://localhost:9001` (login with `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` from `pocochic/.env`).
3. **MinIO API** is at `http://localhost:9000`.

---

## 3. Environment Variables: `.env`

All secrets and local configuration live in `.env` at the `pocochic/` product root (relative to workspace root). **Never commit `.env`.**

Copy `.env.example` to `.env` (inside the `pocochic/` product dir) and fill in your values:

```bash
cd pocochic
cp .env.example .env
# Edit .env with your values
```

The `.env` (and `.env.example`) live inside `pocochic/`. When running docker/npm from workspace root, pass `--env-file pocochic/.env` or `source pocochic/.env` as needed.

Required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite connection string for local dev (e.g., `sqlite://./data/pocochic.db` — relative to `pocochic/` product root) |
| `MINIO_ROOT_USER` | MinIO access key |
| `MINIO_ROOT_PASSWORD` | MinIO secret key |
| `MINIO_ENDPOINT` | MinIO endpoint (default: `http://localhost:9000`) |
| `MINIO_BUCKET` | Default bucket name |
| `MINIO_REGION` | MinIO region (default: `us-east-1`) |

---

## 4. Git Hooks: Husky + commitlint

Husky runs commit hooks from `pocochic/.husky/` (configured in `pocochic/package.json` `"prepare"` script). Run commands from the `pocochic/` product dir or use the root workspace scripts.

### Install (first time or after clean clone)

```bash
cd pocochic
# Install Husky and commitlint (or use root: npm install)
npm install -D husky @commitlint/cli @commitlint/config-conventional

# Initialize husky (the prepare script does this on npm install)
npx husky init
```


### `.husky/commit-msg`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit "$1"
```

### `commitlint.config.js`

```js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'],
    ],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
  },
};
```

### Commit message format

```
<type>: <ticket-id> — <short description>

<optional body referencing ticket details>
```

Example:
```
feat: POCOC-42 — add product listing page
```

---

## 5. Git Workflow: One Commit Per Ticket

### Discipline

- **One commit per ticket.** Each logical change corresponds to exactly one ticket and one commit.
- **Squash/rebase before merging to `main`.** All feature work is rebased onto `main` and squashed into a single commit per ticket before merge.
- **Release branches only accept hotfixes.** Future release branches (`release/*`) are frozen except for critical hotfixes.

### Workflow

```bash
# 1. Create a ticket branch from main
git checkout main
git pull origin main
git checkout -b ticket/POCOC-42

# 2. Make your changes, commit with ticket ID
git add .
git commit -m "feat: POCOC-42 — add product listing page"

# 3. Rebase onto main and squash
git checkout main
git pull origin main
git checkout ticket/POCOC-42
git rebase main
# Squash related commits if needed:
git rebase -i main  # squash to one commit per ticket

# 4. Merge to main (squash merge)
git checkout main
git merge --squash ticket/POCOC-42
git commit -m "feat: POCOC-42 — add product listing page"

# 5. Push
git push origin main
```

### Release branches

```bash
# Release branches only accept hotfixes
git checkout -b release/v1.0.0 main
# ... only hotfix commits allowed ...
git checkout main
git merge release/v1.0.0
```

---

## 6. Dependency Rules: Strict Pinning + Vetting

### Strict pinning

- All dependencies must be **pinned to exact versions** in `package.json` (no `^` or `~` ranges).
- Use `npm ci` (not `npm install`) for reproducible installs from `package-lock.json`.
- `package-lock.json` must be committed and kept up to date.

```json
{
  "dependencies": {
    "vue": "3.4.21",
    "hono": "4.6.8"
  }
}
```

### Vetting rule

- **No new dependency is added without owner approval.**
- All dependencies must be vetted for:
  - License compatibility
  - Maintenance status (recent updates, active maintainers)
  - Known vulnerabilities (`npm audit`)
  - Bundle size impact
- Run `npm audit` before every commit. Fix all `high` or `critical` vulnerabilities.

```bash
# Audit dependencies
npm audit

# Fix auto-fixable issues
npm audit fix
```

---

## 7. Quick Start Checklist

```bash
# 1. Clone repo (workspace root contains AGENTS.md, .opencode/, obsidian/, pocochic/ product, etc.)
git clone <repo-url>
cd <repo-root>   # directory with AGENTS.md and the pocochic/ subdir

# 2. Enter product monorepo and copy env file
cd pocochic
cp .env.example .env
# Edit .env with your values

# 3. Install dependencies (from pocochic/ or use root workspace: npm run install:product)
npm install

# 4. Start local services (from inside pocochic/)
docker compose up -d

# 5. Husky is initialized via "prepare" script during npm install (see package.json)

# 6. Verify
npm run dev
# Open MinIO Console at http://localhost:9001
# Verify SQLite at http://localhost:8080
```


---

## Security Rules

- **`.env` is never committed.** It is in `pocochic/.gitignore` (and root `.gitignore`).
- **No secrets in code.** Use environment variables for all credentials, API keys, and connection strings.
- **No hardcoded credentials** anywhere in the codebase.
- **Rotate credentials** immediately if they are accidentally committed.
- **`npm audit`** must pass before any commit to `main`.

---

## Reference

- Stack details: [[05-Architecture/Stack]]
- Decisions: [[01-Project/Decisions-Log]]
- Agent instructions: `AGENTS.md` (at workspace root)
- Product code now under `pocochic/` subdir (see updated paths in Stack.md)
