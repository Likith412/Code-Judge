# Code Judge — Design Brief

Code Judge is an online judge. You write code in the browser, press Submit, and a
server runs it against hidden test cases and tells you whether it passed.

This document is for whoever designs the screens. It is not a style guide — there
is no palette or type scale here, because those are yours to choose. What this
document does is fix **what is on each screen and where the data comes from**, so
the design does not end up showing things the server cannot send.

That last part matters more than usual on this project. The backend is half built.
Every field below is real: it either exists in the database schema today or is
written into the API design. If you need something that is not in here, it does not
exist, and adding it is a backend change, not a design detail. Section 11 lists the
places where the design will want data that nothing currently provides — read it
before you design profiles, contests or admin.

---

## 1. Who uses it

Three roles, checked on the server every time:

| Role | Can |
|------|-----|
| `USER` | Browse problems, solve them, see their own submissions and profile |
| `SETTER` | Everything a USER can, plus create and edit problems and test cases |
| `ADMIN` | Everything, plus manage users and open anyone's submission |

Most screens are for `USER`. Setter and admin screens are section 9 and are
lower priority — the plan builds their API long before their UI.

There are also two states that are not roles and that the design has to handle
separately, because they change what a signed-in person is allowed to do:

- **Signed in, email not verified.** Can read problems. Cannot run or submit code.
- **Signed in, verified.** Everything.

---

## 2. Five rules that constrain the design

These come from how the backend works. Breaking them means designing a screen
that cannot be built.

**2.1 — Hidden test cases never reach the browser.** A problem has sample cases
(shown) and hidden cases (never shown). When a submission fails on hidden case 9,
the UI may say *failed on test 9 of 12*. It may not show that case's input, its
expected output, or what the code actually printed. Do not design a "see what went
wrong" panel for hidden cases. For sample cases, run through the Run button, the
input and expected output are already on the page.

**2.2 — Source code belongs to one person.** A submission's code is visible to its
author and to an admin. Nobody else, ever. There is no public gallery of solutions.

**2.3 — The sign-in token lives in memory, not in storage.** Practically: every
time the person reloads the tab, the app has no token and must silently fetch a new
one before it can render anything personal. That is a real, visible moment on every
page load and it needs a designed state (see 10.1). It also means there is no
"remember me" checkbox — sessions last 14 days regardless, and a checkbox would be
a lie.

**2.4 — Email and password, nothing else.** No Google button, no GitHub button, no
authenticator app, no SMS code. Email is used for exactly two links: confirm your
address, and reset a forgotten password. Do not design a social sign-in row, and do
not leave a gap where one would go.

**2.5 — The email address can never be changed.** Not in settings, not anywhere.
Username, display name, bio and avatar can change; email is permanent. Account
settings should not show an edit affordance next to it.

---

## 3. The vocabulary

Nine submission states. This list is closed — do not invent a tenth, and do not
soften the names into things like "Almost there".

| Value | Means |
|-------|-------|
| `QUEUED` | Accepted by the server, waiting for a free worker |
| `RUNNING` | A worker is executing it now |
| `ACCEPTED` | Every test case passed |
| `WRONG_ANSWER` | Ran fine, printed the wrong thing |
| `TIME_LIMIT_EXCEEDED` | Too slow |
| `MEMORY_LIMIT_EXCEEDED` | Used too much memory |
| `COMPILATION_ERROR` | Did not compile |
| `RUNTIME_ERROR` | Crashed while running |
| `SYSTEM_ERROR` | Our fault, not the user's |

Three groups that need to read differently at a glance: the two in-progress states,
the one success state, and the six failures. `SYSTEM_ERROR` is worth separating from
the other failures if you can — it is the only one where the right response is "try
again", not "fix your code".

Difficulty is `EASY`, `MEDIUM`, `HARD`. Languages are `java`, `python`, `cpp` —
lowercase in the API, and there is no JavaScript.

---

## 4. Field inventory

What the server can actually send. Anything not listed here has to be derived on
the client, and I have marked the derived ones.

**Problem** (`GET /api/problems/:slug`)

`title`, `slug`, `description` (Markdown), `difficulty`, `constraints` (array of
one-line strings), `examples` (array of `{input, output, explanation}`),
`starterCode` (object keyed by language), `supportedLanguages`, `tags` (plain
strings), `timeLimitMs`, `memoryLimitMb`, `testCaseCount`, `stats.totalSubmissions`,
`stats.acceptedSubmissions`, `stats.solvedByCount`.

Derived: accept rate = `acceptedSubmissions / totalSubmissions`. The server does not
send a percentage.

**Submission** (`GET /api/submissions/:id`)

`status`, `language`, `sourceCode`, `runtimeMs`, `memoryKb`, `testCasesPassed`,
`totalTestCases`, `failedTestIndex`, `errorMessage` (compiler or crash output,
truncated — can be long and can be empty), `isSampleRun`, `createdAt`, `judgedAt`.

`runtimeMs` and `memoryKb` are the worst across all test cases, not an average.
They are absent until the verdict exists. Note the units differ: milliseconds for
time, kilobytes for memory — 32768 KB wants to read as 32 MB.

**User, own account** (`GET /api/auth/me`)

`username`, `displayName`, `email`, `emailVerified`, `role`, `avatarUrl`, `bio`,
`createdAt`, and the `stats` block below.

**User, public profile**

`username`, `displayName`, `avatarUrl`, `bio`, `createdAt` (join date),
`stats.solvedTotal`, `stats.solvedEasy`, `stats.solvedMedium`, `stats.solvedHard`,
`stats.totalSubmissions`, `stats.acceptedSubmissions`, `stats.languageCounts`
(e.g. `{java: 80, python: 30, cpp: 10}`), `solvedProblemIds`.

**Session / device** (`GET /api/auth/sessions`)

`device.browser` ("Chrome 140"), `device.os` ("macOS"), `ip`, `lastUsedAt`,
`createdAt`. Both device fields are optional — they are parsed from the user agent
and can come back empty, so design a fallback row.

**Fields that exist but should not appear in the UI:** `passwordHash` and
`tokenHash` never leave the server. `tokenVersion`, `failedLoginCount`,
`lockedUntil`, `jobId`, `workerId` are internal. Do not surface them, including in
an admin screen, unless someone asks for a debugging view.

---

## 5. Signing up and signing in

Seven screens, all small. The interesting design work is in the error states, not
the forms.

**5.1 Register** — `POST /api/auth/register`

Fields: username (3–20 characters, letters, numbers and underscore only), email,
password. Nothing else — there is no name field, no "confirm email", no terms
checkbox in the spec.

The response is identical whether or not that email already has an account. This is
deliberate: it stops someone using the form to discover who is registered here. So
the success state is *"If that address is new, a link is on its way"* — you cannot
write "Account created!" because sometimes it wasn't. Design the confirmation as a
calm, slightly indefinite message, and give it a resend path.

Username is not covered by that rule and can be checked properly — a taken username
comes back as a real validation error on the field.

**5.2 Check your email** — no endpoint, this is the state after 5.1

Tells the person to open the link. Needs a resend control that hits
`POST /api/auth/resend-verification`, limited to 3 per hour. Design the
rate-limited state: the control is disabled with a reason, not silently dead.

**5.3 Verify** — `GET /api/auth/verify?token=...`

The page the email link lands on. The token works once and expires after 24 hours,
so there are four outcomes, all worth designing: verified, link expired, link
already used, link not valid. Expired and already-used both need an obvious way
forward (resend, or sign in).

**5.4 Sign in** — `POST /api/auth/login`

Email and password. Four failure states:

- Wrong email or wrong password — **the same message for both**, "email or password
  is wrong". Never reveal which. Do not put a "no account with that email?" hint
  under the field.
- Account locked — 5 wrong attempts in 15 minutes locks it for 15 minutes. Say so,
  and say when it lifts.
- Email not verified — comes back as `403 EMAIL_NOT_VERIFIED`. This is not really an
  error, it is an unfinished step: show the resend control inline rather than a red
  failure.
- Rate limited — `429` with a `Retry-After` header telling you how many seconds.

**5.5 Forgot password** — `POST /api/auth/forgot-password`

Same indefinite confirmation as register, for the same reason. 3 per hour.

**5.6 Reset password** — `POST /api/auth/reset-password`

Lands from an email link. Token is valid 30 minutes and dies on use, so it needs
the same expired and already-used states as 5.3. One consequence worth telling the
person on screen: **resetting signs them out on every device**, including this one.
They will land back at sign-in afterwards.

**5.7 Change password** — `POST /api/auth/change-password`

Requires the current password. Same side effect: every other device is signed out,
but this one stays signed in. Say that, and place it in account settings rather
than making it a page of its own.

---

## 6. Problems

**6.1 Problem list** — `GET /api/problems`, paged

The front door. One row per problem: title, difficulty, tags, accept rate, and
whether this person has solved it. Sorting and density are your call; the row has
five things in it and the accept rate is the one people scan for.

Server-side paging on every list in this product — there is no infinite scroll
endpoint, so design real pagination.

Two states beyond the normal: signed out (no solved column at all, since the server
has nobody to check against) and a brand new account (every row unsolved, which is
the first impression for most visitors).

Filters by difficulty, tag and solved status, plus title search, are planned but
later than the list itself. Design the list so a filter rail can appear beside it
without a rework, and treat the filtered-to-nothing state as real.

**6.2 Problem page** — `GET /api/problems/:slug`

Two columns: the question on the left, the editor on the right, the result
underneath the editor. The three regions need to be resizable, or at least the
split between question and editor — people read the question once and then want the
space back.

Left column contents, in order: title, difficulty, tags, the Markdown description,
`constraints` as a list, then `examples`. Each example is input, output, and an
optional explanation. Inputs are multi-line raw stdin text — `"4\n2 7 11 15\n9"` is
a normal example — so they need monospace and preserved line breaks, and they are
worth making copyable.

The time and memory limits (`timeLimitMs`, `memoryLimitMb`) belong on this page too,
near the top. They are part of the problem, not trivia.

---

## 7. Writing and running code

**7.1 The editor**

Monaco, the editor from VS Code. It brings its own look, and you are not going to
restyle its internals — design the frame around it.

Above it: a language dropdown listing only `supportedLanguages` for this problem,
which can be as few as one. Loading a language swaps in that language's
`starterCode`, and a Reset control puts it back. Reset throws away work, so it needs
a confirmation.

Below it: Run and Submit.

- **Run** tests the sample cases only. Cheap, results are not kept.
- **Submit** tests everything including hidden cases, and is saved permanently.

These are different enough in consequence that they should not look like two equal
buttons side by side. Submit is the commitment.

**7.2 States the buttons have to survive**

- Not signed in — both disabled, with a route to sign in.
- Signed in but unverified — both disabled, with the resend-verification control
  right there. This is the single most likely dead end in the product: someone
  reads a problem, writes code, and only then finds out they cannot run it. Design
  that moment properly; ideally warn before they have typed anything.
- Just submitted — the server allows **one submission every 3 seconds** and 30 per
  hour. Submit needs a visible cooldown, not a rejected click.
- Over the hourly limit — a plain explanation and when it resets.

**7.3 The result panel** — `POST /api/submissions` then `GET /api/submissions/:id`

Submitting returns immediately with an id; the verdict arrives later. The panel
walks through `QUEUED → RUNNING → verdict`. First version polls once a second;
later it is a live socket, but the states are the same either way.

Design `QUEUED` as something that can last. If every worker is busy, or the worker
process is down, a submission sits queued — this is not a 200ms flicker, and a
spinner that implies "any moment now" will be wrong sometimes.

The finished panel shows: the verdict, `runtimeMs`, `memoryKb`, and
`testCasesPassed` of `totalTestCases`. The target reading is
`Accepted · 42 ms · 31 MB · 10/10`.

Per verdict, what else appears:

| Verdict | Also show |
|---------|-----------|
| `ACCEPTED` | Nothing more. This is a moment worth designing. |
| `WRONG_ANSWER` | Which test failed (`failedTestIndex`) out of the total. If it was a sample case, the expected and actual output. If hidden, the number only. |
| `TIME_LIMIT_EXCEEDED` | The problem's limit, so the number means something |
| `MEMORY_LIMIT_EXCEEDED` | Same, the memory limit |
| `COMPILATION_ERROR` | `errorMessage` — raw compiler output, monospace, can be dozens of lines, needs its own scroll |
| `RUNTIME_ERROR` | `errorMessage` — a stack trace, same treatment |
| `SYSTEM_ERROR` | An apology and a retry. Not the user's fault. |

Judging stops at the first failure, so `testCasesPassed` is a position in the run,
not a score. Showing it as a progress bar toward 12/12 is a defensible reading;
showing it as a percentage grade is not.

A custom input box, where you supply your own stdin instead of the samples, is
planned for later. Leave it room under the editor.

---

## 8. History and profile

**8.1 My submissions** — `GET /api/submissions/me`, paged

A table: when, which problem, language, verdict, runtime, memory. Filterable by
problem, language and verdict. This is the one screen people use to find the
solution they wrote last week, so the problem title has to be scannable and the
row has to link to the full submission.

**8.2 Submission detail**

The code, syntax highlighted and read-only, plus everything the result panel shows.
Author or admin only. For an admin looking at someone else's, the fact that this is
someone else's code should be visible on screen.

**8.3 Submissions tab inside the problem page**

The same list, scoped to this problem. Fits as a tab beside the question.

**8.4 Public profile**

Username, display name, avatar, bio, join date. Then the counters:
`solvedTotal` broken into easy/medium/hard, `totalSubmissions`,
`acceptedSubmissions` (accept rate is derived from those two), and
`languageCounts` — a small object like `{java: 80, python: 30, cpp: 10}`, so at
most three entries. That is a modest amount of data. Resist the urge to inflate it
into a dashboard; a compact block of numbers is the honest shape.

Also a list of solved problems, from `solvedProblemIds`.

Empty state matters here: a new account has all zeros, no bio, no avatar, and an
empty solved list. That is what most profiles look like.

**8.5 Active devices** — `GET /api/auth/sessions`, `DELETE /api/auth/sessions/:id`

One row per signed-in device: browser, OS, IP, last used. Remote sign-out per row,
plus sign out everywhere. Mark the current device — signing yourself out by accident
from this list is the obvious failure. Remember both device fields can be empty.

---

## 9. Setter and admin

The API for problems and test cases is built early; the UI is deliberately late.
Design these last, and plainly — they are tools for three people, not a product
surface.

**9.1 Problem editor** — create and edit

Every field from section 4, which is a lot for one form: title, slug, a Markdown
description with a preview, difficulty, constraints as a repeatable line list,
examples as repeatable input/output/explanation groups, per-language starter code,
supported languages, tags, time and memory limits, comparison mode (`EXACT` or
`TRIM`, where trim ignores trailing whitespace), and a published toggle.

Unpublished problems are invisible to normal users, so draft versus published needs
to be unmistakable while editing.

**9.2 Test case manager**

Per case: order, input, expected output, hidden or sample, an explanation for
sample cases only, and a weight. Inputs and outputs are multi-line raw text and can
be large. The hidden flag is the one that matters most — getting it wrong leaks the
answer to a problem — so it should be readable down a column at a glance, not
buried in a row.

Bulk upload of many cases at once is planned.

**9.3 User management**

Change role, ban, force sign-out. `status` is `ACTIVE`, `BANNED` or `DELETED`.
Role changes and bans are destructive and get written to an audit log; design them
as deliberate actions with confirmation.

**9.4 Admin home and audit log**

Counts of users, problems, submissions and queue depth; and a log of admin actions
and security events (`actorId`, `action`, `targetType`, `targetId`, `ip`, `meta`,
time). See section 11 — neither has an endpoint yet.

---

## 10. States that apply everywhere

**10.1 Restoring the session.** Because the token is kept in memory (rule 2.3),
every page load starts with the app not knowing who you are. It asks the server,
and until the answer comes back it cannot render the nav, the solved ticks, or
anything else personal. Design this: what the shell looks like before identity
resolves, and how it settles without the whole page jumping.

**10.2 Signed out unexpectedly.** Two ways this happens. The session simply expired
after 14 days — ordinary, sign in again. Or the server detected a stolen token
being replayed and killed every session for that account as a precaution. The second
is rare but it hits a legitimate user mid-session, sometimes mid-submission. It
deserves its own message explaining that this was a security measure, rather than
being dropped at a generic sign-in screen with no explanation.

**10.3 Errors.** Every error from the API has the same shape:
`{ error: { code, message, details } }`. `code` is a stable string like
`EMAIL_NOT_VERIFIED`, `message` is human-readable, `details` is an optional list of
per-field validation problems. Field-level errors belong on the fields; everything
else needs a place to appear. `429` responses carry a `Retry-After` in seconds, so
rate-limit messages can say how long.

**10.4 Empty and loading.** Every list is paged and every list can be empty: no
problems match the filter, no submissions yet, no solved problems, no devices but
this one. The new-account path hits several of these in a row.

**10.5 Small screens.** The problem page is two columns of dense text and a code
editor. There is no mobile app and no stated breakpoint strategy, so decide what
the problem page does when the columns cannot coexist, and say what you decided.

---

## 11. What the API does not provide

Everything above is backed by a real field or endpoint. The following are in the
feature list but have **no data source yet**. If a design needs them, that is a
backend change — flag it rather than drawing around it.

| Wanted | Status |
|--------|--------|
| Activity calendar on the profile | No endpoint and no per-day data. Submissions have timestamps, so it is buildable, but nothing aggregates them today. |
| Site-wide leaderboard | The database is indexed for it. No endpoint. |
| Contests — list, detail, live ranking | The `contests` and `contestParticipants` collections are designed (title, start and end time, lettered problems with points, score, penalty minutes, rank, per-problem solve time and wrong attempts). **No endpoints exist at all.** Anything you design here is ahead of the API. |
| Admin home counts | No endpoint. Queue depth lives in Redis and is not exposed. |
| Audit log view | Collection designed, no endpoint. |
| Tag pages | Tags are plain strings on a problem in the first version. There is no tag entity to link to yet. |
| Per-test-case results | The database keeps only "8 of 12 passed" and which one failed first. A per-case breakdown is a later addition. Do not design a table of twelve rows. |
| Solved tick on the problem list | The data exists on the user, but whether the list endpoint joins it is undecided. Assume yes, and know it is an assumption. |
| "Tried but not solved" filter | Needs a query the API does not define. Solved and unsolved are safe; tried is not. |
| Editorials and solution pages | Listed as a someday feature with no schema behind it. Nothing to show. |

---

## 12. Not in this product

So no space gets designed for them: no discussion threads or comments, no
following other users, no copy-checking between submissions, no payments or paid
tiers, no mobile app, no problems that need interactive back-and-forth input, and
no custom checkers — output must match exactly, give or take trailing whitespace.

---

## 13. Priority

If you are designing in order rather than all at once, this follows the build:

1. Problem page with editor and result panel (7) — the product is this screen
2. Problem list (6.1)
3. Sign in, register, verify, the password flows (5)
4. Submission history and detail (8.1–8.3)
5. Profile and devices (8.4–8.5)
6. Setter and admin tools (9)
7. Contests, once the API exists (11)
