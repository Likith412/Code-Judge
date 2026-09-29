# Code Judge — Phase 1 by hand

Authentication has no automated tests yet, so this is the list to walk through
before calling phase 1 finished, and again after anything in `backend/src/controllers/auth/`
changes. It takes about ten minutes.

Everything below is the behaviour described in [04-authentication.md](04-authentication.md).
If a step does something else, the document is right and the code is wrong.

---

## Starting it up

Three terminals, from the repo root.

```
docker compose up -d              # MongoDB on 27017
cd backend  && npm run dev        # API on 3000
cd frontend && npm run dev        # web app on 5173
```

First time only:

```
cd backend
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # paste into JWT_SECRET
```

The API refuses to start if any variable is missing, and says which one.

**No email is sent anywhere.** `SMTP_URL=console://` prints the whole message
to the API log, link included. Every step below that says "open the link"
means: copy it out of that terminal.

To start again from nothing: `docker compose down -v`.

---

## 1. Sign up

| Do this | Expect |
|---------|--------|
| Register with the password `short` | Rejected: at least 10 characters. Length is the **only** password rule — `password123` is accepted, by choice |
| Register properly | The page says *if that address needed an account, a link is on its way* — never "account created" |
| Register again with the **same email**, different username | Exactly the same page. No hint that the address is taken |
| Register again with the **same username** | A real error on the username field. Usernames are public, addresses are not |
| Try to sign in before opening the link | `EMAIL_NOT_VERIFIED`, shown as an unfinished step with a resend button, not as a red failure |

## 2. The verification link

| Do this | Expect |
|---------|--------|
| Open the link from the log | Email confirmed |
| Open the same link a second time | *That link was already used* |
| Change one letter in the token and open it | *That link is not valid* |
| Ask for a new link, then open the **older** one | Not valid. Only the newest link works |

## 3. Sign in

| Do this | Expect |
|---------|--------|
| Wrong password | *Email or password is wrong* |
| An address with no account | The same sentence, and about the same wait. Never "no such account" |
| Wrong password ten times, then the **right** one | Signed in. Nothing locks: there is no lockout and no rate limit, by choice — see the gaps at the bottom |
| `db.auditlogs.find({ action: "LOGIN_FAILED" })` after those tries | One row per failed attempt. That log is the only trace a guesser leaves |

## 4. Staying signed in — the one that matters most

The access token lasts 10 minutes and lives in memory only.

| Do this | Expect |
|---------|--------|
| Sign in, then reload the page | Still signed in. There is a moment of *checking your session* first — that is the silent refresh |
| Sign in, wait more than 10 minutes, then click around | Nothing breaks. The network tab shows one `POST /api/auth/refresh`, then the request that failed being sent again |
| Open the same account in two tabs and reload both at once | Both stay signed in. That is the 10 second grace window, and it is the only time a spent token is forgiven |

To do the 10 minute wait in seconds instead, set `ACCESS_TOKEN_TTL=20s` in
`backend/.env` and restart the API. Put it back afterwards.

## 5. A stolen refresh token

This is the design's best moment, and the thing to be able to demonstrate.

1. Sign in. In the browser devtools, copy the value of the `refresh_token` cookie.
2. Keep using the app for a minute so it refreshes at least once. That cookie is now spent.
3. Replay the copied value from a different browser or from curl:

```
curl -i -X POST http://localhost:3000/api/auth/refresh \
  -H "Origin: http://localhost:5173" \
  -H "Cookie: refresh_token=THE_OLD_VALUE"
```

| Expect |
|--------|
| `401 SESSION_REVOKED` for the replay |
| The real browser is signed out too, on its next call, with the message explaining this was a safety measure — not a blank login screen |
| `db.sessions.find({ familyId: "fam_..." })` shows every row `REVOKED`, reason `REUSE_DETECTED` |
| `db.auditlogs.find({ action: "REFRESH_REUSE_DETECTED" })` has a row with the family id and how many sessions it killed |

Read the database with:

```
docker exec -it code-judge-mongo mongosh code-judge
```

## 6. Signing out

| Do this | Expect |
|---------|--------|
| Sign in on two browsers, open **Account** on both | Each device list shows both, and marks itself *this device* |
| Sign out one row from the other browser | That browser is signed out on its next call |
| *Sign out everywhere* from browser A | Browser B is out on its next call, and A **stays signed in**. `tokenVersion` went up, so B's access token dies at once rather than in ten minutes |
| Reload A's device list afterwards | One row, marked *this device*, still showing the original sign-in time — A did not sign in again |
| *Sign out everywhere* with only one device | The button is disabled, there is nothing to sign out |

## 7. Password change and reset

| Do this | Expect |
|---------|--------|
| Change the password with the wrong current one | Refused. A stolen access token alone cannot do lasting damage |
| Change it properly, while signed in elsewhere | This device stays signed in, the other one is out at once |
| Sign in with the old password | Refused |
| Forgot password for an address with no account | The same vague reply as a real one |
| Open the reset link, set a new password | Signed out everywhere, including this device, and the screen says so before the form is submitted |
| Open the same reset link again | *That link was already used* |
| Reset the password of an account that was never verified | The address is now confirmed too. Reaching the inbox proved it |

## 8. The doors that should be shut

| Do this | Expect |
|---------|--------|
| `curl http://localhost:3000/api/auth/me` | `UNAUTHENTICATED` |
| The same with a made-up bearer token | `UNAUTHENTICATED`, not a crash |
| `POST /api/auth/refresh` with `Origin: http://evil.example.com` | `403 Origin not allowed` |
| Look at any response containing a user | No `passwordHash` and no `tokenVersion`. Responses are built field by field in `publicUser()`, so nothing else can slip in either |
| Look at the `refresh_token` cookie in devtools | `HttpOnly`, `SameSite=Strict`, `Path=/api/auth`. `document.cookie` in the console cannot see it |

---

## Known gaps, on purpose

- **Nothing but bcrypt stands between a guesser and an account.** No rate limit, no lockout, no common-password check — a ten-character password of any kind is accepted, and it can be guessed at as fast as bcrypt answers. Failed attempts land in `auditLogs`, so the pattern is visible afterwards, but nothing blocks it while it happens. Rate limits need Redis and arrive in phase 6; the other two need nothing.
- **No automated tests.** The three in the dev plan are still worth writing; the refresh-reuse one in section 5 is the first candidate.
- **`req.ip` is the proxy's address in development**, so every device row shows `::1`. Express only trusts `X-Forwarded-For` when `trust proxy` is set, which is a deployment decision, not a development one.
