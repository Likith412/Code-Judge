import { useContext, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { listUsers, updateUser, forceLogout } from "../../services/api/admin";
import { apiError } from "../../services/api/client";
import UserContext from "../../context/UserContext";
import PageHeader from "../../components/PageHeader";
import ProblemPager from "../../components/ProblemPager";
import Notice from "../../components/Notice";
import LoadFailed from "../../components/LoadFailed";
import { formatWhen } from "../../utils/date";

import "./index.css";

const apiStatusConstants = {
   initial: "INITIAL",
   success: "SUCCESS",
   failure: "FAILURE",
   inProgress: "IN_PROGRESS",
};

const ROLES = ["USER", "SETTER", "ADMIN"];
const STATUSES = ["ACTIVE", "BANNED", "DELETED"];

const STATUS_TAG = {
   ACTIVE: "tag tag-neutral",
   BANNED: "tag tag-accent",
   DELETED: "tag admin-tag-deleted",
};

// Every account, newest first. Roles are fixed; ban and sign-out ask first.
const AdminUsersPage = () => {
   const { user: me } = useContext(UserContext);
   const [params, setParams] = useSearchParams();
   const page = Number(params.get("page")) || 1;
   const q = params.get("q") || "";
   const role = params.get("role") || "";
   const status = params.get("status") || "";

   const [result, setResult] = useState(null);
   const [apiStatus, setApiStatus] = useState(apiStatusConstants.initial);
   const [failure, setFailure] = useState("");
   const [message, setMessage] = useState(null);
   const [reloadCount, setReloadCount] = useState(0);

   // What is typed and picked. It applies on Search, and follows the url.
   const [draft, setDraft] = useState({ q, role, status });
   const [synced, setSynced] = useState(`${q}:${role}:${status}`);

   if (`${q}:${role}:${status}` !== synced) {
      setSynced(`${q}:${role}:${status}`);
      setDraft({ q, role, status });
   }

   const filtered = Boolean(q || role || status);

   // { user, title, body, label, done, run } while the dialog is open.
   const [confirm, setConfirm] = useState(null);
   const [busy, setBusy] = useState(false);

   useEffect(() => {
      let cancelled = false;

      const load = async () => {
         setApiStatus(apiStatusConstants.inProgress);

         try {
            const data = await listUsers({ page, q, role, status });

            if (cancelled) return;

            setResult(data);
            setApiStatus(apiStatusConstants.success);
         } catch (error) {
            if (cancelled) return;

            setFailure(apiError(error).message);
            setApiStatus(apiStatusConstants.failure);
         }
      };

      load();

      return () => {
         cancelled = true;
      };
   }, [page, q, role, status, reloadCount]);

   // A new filter goes back to page one. Empty ones leave the url.
   const changeParams = (changes) => {
      const next = { ...Object.fromEntries(params), page: 1, ...changes };

      setParams(
         Object.fromEntries(
            Object.entries(next).filter(
               ([key, value]) =>
                  value && !(key === "page" && Number(value) === 1),
            ),
         ),
      );
   };

   const apply = async () => {
      setBusy(true);
      setMessage(null);

      try {
         await confirm.run();
         setMessage({ tone: "note", text: confirm.done });
         setReloadCount((count) => count + 1);
      } catch (error) {
         setMessage({ tone: "error", text: apiError(error).message });
      } finally {
         setBusy(false);
         setConfirm(null);
      }
   };

   const askBan = (user) =>
      setConfirm({
         title: `Ban @${user.username}?`,
         body: "They are signed out everywhere and cannot sign in until the ban is lifted.",
         label: "Ban account",
         done: `@${user.username} is banned.`,
         run: () => updateUser(user.id, { status: "BANNED" }),
      });

   const askUnban = (user) =>
      setConfirm({
         title: `Lift the ban on @${user.username}?`,
         body: "They can sign in again straight away.",
         label: "Lift ban",
         done: `The ban on @${user.username} is lifted.`,
         run: () => updateUser(user.id, { status: "ACTIVE" }),
      });

   const askSignOut = (user) =>
      setConfirm({
         title: `Sign @${user.username} out everywhere?`,
         body: "Every session on this account ends now. They keep the account and can sign in again.",
         label: "Sign out everywhere",
         done: `@${user.username} was signed out of every device.`,
         run: () => forceLogout(user.id),
      });

   /* ---- rows ----------------------------------------------------------- */

   const renderActions = (user, isMe) => {
      if (isMe) return <span className="cj-muted">You</span>;
      if (user.status === "DELETED") return null;

      // Banned accounts have no sessions left, so only the ban can change.
      if (user.status === "BANNED") {
         return (
            <button className="btn btn-ghost" onClick={() => askUnban(user)}>
               Lift ban
            </button>
         );
      }

      return (
         <>
            <button className="btn btn-ghost" onClick={() => askSignOut(user)}>
               Force sign-out
            </button>

            {/* An admin cannot ban another admin. */}
            {user.role !== "ADMIN" && (
               <button className="btn btn-ghost" onClick={() => askBan(user)}>
                  Ban
               </button>
            )}
         </>
      );
   };

   const renderRow = (user) => {
      const isMe = user.id === me.id;

      return (
         <div className="admin-user-row" key={user.id}>
            <div className="admin-user-name">
               <Link to={`/u/${user.username}`}>@{user.username}</Link>
               <div className="cj-muted">{user.email}</div>
            </div>

            <div className="admin-role-text">{user.role}</div>

            <div>
               <span className={STATUS_TAG[user.status]}>{user.status}</span>
            </div>

            <div className="cj-muted admin-user-joined">
               {formatWhen(user.createdAt)}
            </div>

            <div className="admin-user-latest">
               {user.latestSubmissionId ? (
                  <Link to={`/submissions/${user.latestSubmissionId}`}>
                     Latest submission
                  </Link>
               ) : (
                  <span className="cj-muted">None</span>
               )}
            </div>

            <div className="admin-user-actions">
               {renderActions(user, isMe)}
            </div>
         </div>
      );
   };

   const renderList = () => {
      if (result.users.length === 0) {
         return (
            <p className="cj-muted admin-empty">
               {filtered
                  ? "No accounts match these filters."
                  : "No accounts yet."}
            </p>
         );
      }

      return (
         <>
            <div className="admin-user-head">
               <span>User</span>
               <span>Role</span>
               <span>Status</span>
               <span className="admin-user-joined">Joined</span>
               <span className="admin-user-latest">Submissions</span>
               <span className="admin-user-actions">Actions</span>
            </div>

            {result.users.map(renderRow)}

            <ProblemPager
               {...result}
               onGo={(number) => changeParams({ page: number })}
            />
         </>
      );
   };

   const renderBody = () => {
      switch (apiStatus) {
         case apiStatusConstants.success:
            return renderList();
         case apiStatusConstants.failure:
            return (
               <LoadFailed
                  title="Could not load users"
                  message={failure}
                  onRetry={() => setReloadCount((count) => count + 1)}
               />
            );
         case apiStatusConstants.inProgress:
            return <p className="cj-muted admin-empty">Loading accounts…</p>;
         default:
            return null;
      }
   };

   const word = result?.total === 1 ? "account" : "accounts";

   return (
      <main className="cj-main">
         <PageHeader
            title="Users"
            count={result ? `${result.total} ${word}` : " "}
         />

         <form
            className="admin-tools"
            onSubmit={(event) => {
               event.preventDefault();
               changeParams({ ...draft, q: draft.q.trim() });
            }}
         >
            <input
               className="input admin-search"
               value={draft.q}
               onChange={(event) =>
                  setDraft({ ...draft, q: event.target.value })
               }
               placeholder="Username or email"
               aria-label="Search users"
            />

            <select
               className="input admin-select"
               value={draft.role}
               onChange={(event) =>
                  setDraft({ ...draft, role: event.target.value })
               }
               aria-label="Filter by role"
            >
               <option value="">All roles</option>
               {ROLES.map((value) => (
                  <option key={value}>{value}</option>
               ))}
            </select>

            <select
               className="input admin-select"
               value={draft.status}
               onChange={(event) =>
                  setDraft({ ...draft, status: event.target.value })
               }
               aria-label="Filter by status"
            >
               <option value="">All statuses</option>
               {STATUSES.map((value) => (
                  <option key={value}>{value}</option>
               ))}
            </select>

            <button className="btn btn-secondary">Search</button>
         </form>

         <Notice tone={message?.tone}>{message?.text}</Notice>

         {renderBody()}

         {confirm && (
            <div className="dialog-backdrop">
               <div
                  className="dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="admin-confirm"
               >
                  <div className="dialog-title" id="admin-confirm">
                     {confirm.title}
                  </div>

                  <div className="dialog-body">{confirm.body}</div>
                  <div className="admin-dialog-note">
                     This is recorded in the audit log.
                  </div>

                  <div className="dialog-actions">
                     <button
                        className="btn btn-secondary"
                        disabled={busy}
                        onClick={() => setConfirm(null)}
                     >
                        Cancel
                     </button>

                     <button
                        className="btn btn-primary"
                        disabled={busy}
                        onClick={apply}
                     >
                        {busy ? "Saving…" : confirm.label}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </main>
   );
};

export default AdminUsersPage;
