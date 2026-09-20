# Code Judge — Features

Stack: **React (Vite) + Node/Express + MongoDB + Redis (BullMQ) + Docker workers**

Every feature has a version tag:

- **V1** — the smallest thing that works end to end. Build this first.
- **V2** — makes it feel like a real website (profiles, history, more languages, live status).
- **V3** — extra things that make it stand out (contests, leaderboard, admin panel).

---

## 1. Users and login

| # | Feature | Version | Notes |
|---|---------|---------|-------|
| 1.1 | Sign up with email and password | V1 | Password is hashed with bcrypt. The real password is never saved. |
| 1.2 | Verify email before you can run code | V1 | You can read problems without it, but not run code. This stops bots. |
| 1.3 | Login gives a short-lived access token and a refresh token | V1 | Email and password only, no second step. See [04-authentication.md](04-authentication.md) |
| 1.4 | Logout from this device, or from all devices | V1 | One session row is revoked, or all of them plus `tokenVersion` + 1. |
| 1.5 | See your active devices and log out any one of them | V2 | "Chrome on Mac, last used 2 minutes ago" |
| 1.6 | Forgot password by email link | V1 | Using the link logs you out everywhere. |
| 1.7 | Change password (you must type the old one) | V1 | |
| 1.8 | Ask for the current password again before risky actions | V1 | Change password and delete account. The email address cannot be changed at all. |
| 1.9 | Three roles: `USER`, `SETTER`, `ADMIN` | V1 | Checked on the server, not only in the UI. |
| 1.10 | Delete account (keep old submissions but remove the name) | V3 | Needs a `deletedAt` field and an anonymous username, because `username` is a unique index. |

## 2. Problems

| # | Feature | Version | Notes |
|---|---------|---------|-------|
| 2.1 | Problem list with title, difficulty, tags, accept rate, and a solved tick | V1 | Paged on the server. |
| 2.2 | Problem page with the question, limits, and examples | V1 | Written in Markdown, cleaned before showing. |
| 2.3 | Starter code for each language | V1 | |
| 2.4 | Filter by difficulty, tag, and your status (solved / tried / not tried) | V2 | |
| 2.5 | Search by title and text | V2 | MongoDB text index. |
| 2.6 | Tags as their own pages | V3 | In V1 tags are just strings. |
| 2.7 | Draft problems that normal users cannot see | V1 | |
| 2.8 | Solution page that opens after you solve the problem | V3 | |

## 3. Editor and run/submit

| # | Feature | Version | Notes |
|---|---------|---------|-------|
| 3.1 | Monaco code editor with colors for each language | V1 | |
| 3.2 | Language dropdown, only the languages the problem allows | V1 | |
| 3.3 | **Run** button — tests only the sample cases | V1 | Cheap. The result is not kept for long. |
| 3.4 | **Submit** button — tests all cases, including hidden ones | V1 | This is saved forever. |
| 3.5 | Box to type your own input | V2 | |
| 3.6 | Your code is saved as you type, per problem and language | V2 | Browser first, server later. |
| 3.7 | Status changes live: `QUEUED → RUNNING → result` | V2 | WebSocket. V1 just polls every second. |
| 3.8 | Result box: verdict, time, memory, how many tests passed, and the first failed sample | V1 | Hidden test inputs are **never** sent to the browser. |
| 3.9 | Reset to starter code | V1 | |

## 4. The judge (the main part)

| # | Feature | Version | Notes |
|---|---------|---------|-------|
| 4.1 | Submission goes into a Redis queue and the API replies at once | V1 | The API never runs user code itself. |
| 4.2 | A pool of workers picks jobs from the queue | V1 | One container at a time per worker. |
| 4.3 | Code runs in a fresh Docker container that is thrown away after | V1 | No network, read-only disk, tmpfs work folder, non-root user, no extra capabilities, process count limit. |
| 4.4 | Time limit and memory limit per problem | V1 | Container limits plus a hard clock kill. |
| 4.5 | Compare output exactly, and also a mode that ignores extra spaces at the end | V1 | |
| 4.6 | Verdicts: `ACCEPTED`, `WRONG_ANSWER`, `TIME_LIMIT_EXCEEDED`, `MEMORY_LIMIT_EXCEEDED`, `COMPILATION_ERROR`, `RUNTIME_ERROR`, `SYSTEM_ERROR` | V1 | |
| 4.7 | Stop at the first failed test and report the count | V1 | |
| 4.8 | Languages: Java (V1), then Python (V2), then C++ (V2) | V1→V2 | One Docker image per language, pulled in advance. No JavaScript. |
| 4.9 | One run command per language — no separate compile stage | V1 | Java and C++ still have to be compiled, but it happens inside that one command in the container. |
| 4.10 | Same job can be retried safely, but only when it failed with a system error | V2 | Never re-run a job that already has a verdict. |
| 4.11 | Cut output text to a size limit before saving | V1 | Stops someone printing 10 MB of text. |
| 4.12 | Limit how many submissions one user can send, and how many can wait in the queue | V1 | Redis counter. |
| 4.13 | Write down what the sandbox does **not** protect against | V1 | Be honest in the README. Docker alone is not a perfect wall. |

## 5. Submission history

| # | Feature | Version | Notes |
|---|---------|---------|-------|
| 5.1 | Save every submission with code, language, verdict, time, memory, tests passed | V1 | |
| 5.2 | "My submissions" page with filters | V2 | |
| 5.3 | Submissions tab inside the problem page | V2 | |
| 5.4 | Submission detail page with the exact code | V2 | Only the owner or an admin. |
| 5.5 | Result of each test case, one by one | V3 | Kept in its own collection. |

## 6. Profile and progress

| # | Feature | Version | Notes |
|---|---------|---------|-------|
| 6.1 | Public profile: username, picture, short bio, join date | V2 | |
| 6.2 | Counts: solved by difficulty, total submissions, accept rate | V2 | Counters kept on the user document. |
| 6.3 | Which languages you use most | V2 | |
| 6.4 | Activity calendar | V3 | |
| 6.5 | List of problems you solved | V2 | |

## 7. Contests

| # | Feature | Version | Notes |
|---|---------|---------|-------|
| 7.1 | Admin makes a contest with a start time, end time, and problems | V3 | |
| 7.2 | Users join and take part | V3 | |
| 7.3 | Problems stay hidden before the start and lock after the end | V3 | |
| 7.4 | Score with a penalty for wrong tries | V3 | |
| 7.5 | Live contest ranking | V3 | |
| 7.6 | Site-wide leaderboard | V3 | |

## 8. Admin and problem setters

| # | Feature | Version | Notes |
|---|---------|---------|-------|
| 8.1 | Add, edit, delete problems (`SETTER` or `ADMIN`) | V1 API / V2 UI | |
| 8.2 | Upload many test cases at once | V2 | |
| 8.3 | Publish or hide a problem | V1 | |
| 8.4 | Admin home with counts of users, problems, submissions, queue size | V3 | |
| 8.5 | Manage users: change role, ban, force logout | V3 | |
| 8.6 | Open any submission to debug it | V3 | Written to an audit log. |
| 8.7 | Re-judge all submissions of a problem after fixing a test case | V3 | |

## 9. Platform basics

| # | Feature | Version | Notes |
|---|---------|---------|-------|
| 9.1 | Check every request body with Zod | V1 | |
| 9.2 | One error shape everywhere: `{ error: { code, message, details } }` | V1 | |
| 9.3 | Rate limits, both global and per route | V1 | |
| 9.4 | JSON logs with a request id that follows the job into the worker | V2 | |
| 9.5 | `/healthz` and `/readyz` for API and worker | V2 | |
| 9.6 | Paging on every list endpoint | V1 | |
| 9.7 | `docker compose up` starts api, worker, mongo, redis, and web | V2 | |
| 9.8 | CI that runs lint and tests | V3 | |
| 9.9 | Seed script with about 15 problems and their test cases | V1 | So the demo works in 30 seconds. |

---

## Things this project will not do

- It is not a safe place to run code from strangers at scale. Docker helps, but it is not a perfect wall. gVisor or Firecracker would be the real fix, and that is out of scope.
- No problems that need back-and-forth input, and no custom checkers in V1. Output must match exactly.
- No payments, no discussion forum, no copy-check between users.
- No mobile app.

## When is V1 done?

A logged-in user with a verified email opens `/problems/two-sum`, writes Java in Monaco, presses **Submit**. The API puts the job in the queue and answers `202` with a submission id. A worker runs the code in a throwaway Docker container against 10 test cases with a 2 second and 256 MB limit. Within a few seconds the page shows `Accepted · 42 ms · 31 MB · 10/10`, and the submission is in the history.
