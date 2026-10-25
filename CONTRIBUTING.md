# Contributing

Thanks for helping with Libre Metronome. This file covers the workflow and the checks a change has to pass.

## Setup

```bash
git clone https://github.com/hybridpicker/LibreMetronome.git && cd LibreMetronome
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements-dev.txt
cd frontend && npm install && cd ..
```

Backend commands need `SECRET_KEY` in the environment; `run_tests.sh` sets a throw-away value for you.

## Before you open a pull request

```bash
./run_tests.sh            # ruff, mypy, bandit, Django tests, ESLint, Jest - must be green
./run_tests.sh coverage   # coverage gates (backend 100 %, frontend thresholds in frontend/package.json)
```

* No warnings: `npm run lint` runs ESLint with `--max-warnings 0`, ruff and mypy run clean.
* New behaviour comes with tests that assert behaviour (values, calls with arguments, boundaries, error
  paths). Tests that assert nothing, or that test a local copy of the code, will be rejected.
* Timing code is tested with fake timers and a fake `AudioContext`; never wait on real timers.
* Tests use synthetic data only. Never commit credentials, `.env` files or personal data.
* Keep the public behaviour and the HTTP API stable; call out breaking changes in the pull request.
* Design changes (colours, layout, new visual elements) go through the design process in
  `docs/design-system.md` first; a pull request that only refactors must not change the UI.

## Style

* English for code, comments, tests, commits and documentation.
* Conventional commit messages (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`), one concern per commit.
* Python: ruff (formatting and lint) with the rules in `backend/pyproject.toml`; type hints where they
  help mypy. JavaScript: the rules in `frontend/.eslintrc.js`.
* Avoid `console.log` in new production code; remove debug output before merging.
* Magic numbers belong in a named constant next to the code that uses them (see
  `frontend/src/hooks/useMetronomeLogic/constants.js`).

## Security and dependencies

* `pip-audit -r requirements.txt`, `bandit` and `npm audit --omit=dev` should report nothing new.
  Known, accepted findings are listed in `docs/quality-report.md`.
* Do not add large dependencies without a clear need; keep `package-lock.json` consistent with
  `package.json` (`npm install`, not `npm update`, unless the update is the point of the change).

## Deployment note

A push to `main` triggers the production deployment of the website (see `docs/release-plan.md`).
Work on a branch and open a pull request; only merge when the web build is meant to go live.
