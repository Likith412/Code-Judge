# Code Judge — Documents

The plan for this project, and how to check the parts that are built.

| # | Document | What is inside |
|---|----------|----------------|
| 1 | [01-features.md](01-features.md) | Every feature, split into V1 / V2 / V3, plus what the project will not do |
| 2 | [02-dev-plan.md](02-dev-plan.md) | Phase-by-phase build order, folder layout, timeline, risks |
| 3 | [03-db-design.md](03-db-design.md) | All collections with fields, types, examples, indexes, and the relationship picture |
| 4 | [04-authentication.md](04-authentication.md) | Login: email + password, rotating refresh tokens, roles, threat list |
| 5 | [05-design.md](05-design.md) | What is on each screen and which field it comes from, written for whoever designs them |
| 6 | [06-phase1-checklist.md](06-phase1-checklist.md) | The by-hand run through the login, to do before calling phase 1 finished |
| 7 | [07-frontend-structure.md](07-frontend-structure.md) | Folder layout and conventions for the React side, taken from the Sendly frontend |
| 8 | [08-problems-api.md](08-problems-api.md) | The problems and test case routes, and how a hidden case is kept off every public response |
| 9 | [09-phase2-checklist.md](09-phase2-checklist.md) | The by-hand run through the problems API, to do before calling phase 2 finished |

Short version: build V1 first — login, problems, editor, queue, Docker worker, verdict. Everything else can wait.

## Diagrams

Diagram sources are in [diagrams/](diagrams/) as Mermaid `.mmd` files. The `.md` documents show the rendered `.svg` pictures, not the diagram code.

| Picture | Source | Used in |
|---------|--------|---------|
| [architecture.svg](diagrams/architecture.svg) | [architecture.mmd](diagrams/architecture.mmd) | dev plan |
| [submission-flow.svg](diagrams/submission-flow.svg) | [submission-flow.mmd](diagrams/submission-flow.mmd) | dev plan |
| [db-erd.svg](diagrams/db-erd.svg) | [db-erd.mmd](diagrams/db-erd.mmd) | database design |
| [auth-register.svg](diagrams/auth-register.svg) | [auth-register.mmd](diagrams/auth-register.mmd) | authentication |
| [auth-login.svg](diagrams/auth-login.svg) | [auth-login.mmd](diagrams/auth-login.mmd) | authentication |
| [auth-refresh-rotation.svg](diagrams/auth-refresh-rotation.svg) | [auth-refresh-rotation.mmd](diagrams/auth-refresh-rotation.mmd) | authentication |
| [auth-token-lifecycle.svg](diagrams/auth-token-lifecycle.svg) | [auth-token-lifecycle.mmd](diagrams/auth-token-lifecycle.mmd) | authentication |

After editing a `.mmd` file, render it again — see [diagrams/README.md](diagrams/README.md).
