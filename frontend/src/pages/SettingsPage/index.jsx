import { useContext, useEffect, useState } from "react";

import { listSessions, revokeSession } from "../../services/api/auth";
import { apiError, fieldErrors } from "../../services/api/client";
import { formatWhen } from "../../utils/date";

import UserContext from "../../context/UserContext";

import Field from "../../components/Field";
import Notice from "../../components/Notice";

import "./index.css";

const TABS = [
   { id: "account", label: "Account" },
   { id: "password", label: "Password" },
   { id: "devices", label: "Devices" },
];

const apiStatusConstants = {
   initial: "INITIAL",
   success: "SUCCESS",
   failure: "FAILURE",
   inProgress: "IN_PROGRESS",
};

/* ---- account ---------------------------------------------------------- */

const AccountTab = () => {
   const { user, updateProfile } = useContext(UserContext);

   const [form, setForm] = useState({
      username: user.username,
      displayName: user.displayName || "",
      bio: user.bio || "",
   });
   const [fields, setFields] = useState({});
   const [problem, setProblem] = useState(null);
   const [saved, setSaved] = useState(false);
   const [busy, setBusy] = useState(false);

   const onChangeField = (event) => {
      setSaved(false);
      setForm({ ...form, [event.target.name]: event.target.value });
   };

   const onSubmitForm = async (event) => {
      event.preventDefault();

      setBusy(true);
      setFields({});
      setProblem(null);
      setSaved(false);

      try {
         await updateProfile(form);
         setSaved(true);
      } catch (error) {
         const { code, message } = apiError(error);

         if (code === "VALIDATION_ERROR") setFields(fieldErrors(error));
         else setProblem(message);
      } finally {
         setBusy(false);
      }
   };

   return (
      <form className="settings-panel" onSubmit={onSubmitForm} noValidate>
         <Notice>{problem}</Notice>

         {/* Shown, not edited. The address is the login name and the thing the
             confirmation link proved, so it is permanent. */}
         <div className="field">
            <label>Email</label>

            <div className="settings-static">
               {user.email}
               {user.emailVerified ? (
                  <span className="tag tag-neutral">Verified</span>
               ) : (
                  <span className="tag tag-outline">Not verified</span>
               )}
            </div>

            <div className="field-hint">
               Your email is permanent - it can’t be changed on this account.
            </div>
         </div>

         <Field
            label="Username"
            name="username"
            value={form.username}
            onChange={onChangeField}
            error={fields.username}
            hint="3–20 characters. Letters, numbers, underscore."
         />

         <Field
            label="Display name"
            name="displayName"
            placeholder="How your name appears on your profile"
            value={form.displayName}
            onChange={onChangeField}
            error={fields.displayName}
         />

         <Field
            label="Bio"
            name="bio"
            multiline
            placeholder="A line or two"
            value={form.bio}
            onChange={onChangeField}
            error={fields.bio}
         />

         <div className="settings-save">
            <button type="submit" className="btn btn-primary" disabled={busy}>
               {busy ? "Saving…" : "Save changes"}
            </button>

            {saved && <span className="settings-saved">Saved</span>}
         </div>
      </form>
   );
};

/* ---- password --------------------------------------------------------- */

const PasswordTab = () => {
   const { changePassword } = useContext(UserContext);

   const [form, setForm] = useState({ currentPassword: "", password: "" });
   const [fields, setFields] = useState({});
   const [problem, setProblem] = useState(null);
   const [changed, setChanged] = useState(false);
   const [busy, setBusy] = useState(false);

   const onChangeField = (event) =>
      setForm({ ...form, [event.target.name]: event.target.value });

   const onSubmitForm = async (event) => {
      event.preventDefault();

      setBusy(true);
      setFields({});
      setProblem(null);
      setChanged(false);

      try {
         await changePassword(form);

         setForm({ currentPassword: "", password: "" });
         setChanged(true);
      } catch (error) {
         const { code, message } = apiError(error);

         if (code === "VALIDATION_ERROR") setFields(fieldErrors(error));
         else setProblem(message);
      } finally {
         setBusy(false);
      }
   };

   return (
      <form className="settings-panel" onSubmit={onSubmitForm} noValidate>
         <Notice>{problem}</Notice>

         <Field
            label="Current password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={onChangeField}
            error={fields.currentPassword}
            required
         />

         <Field
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={onChangeField}
            error={fields.password}
            required
         />

         <p className="settings-aside">
            Changing your password signs out every other device. This one stays
            signed in.
         </p>

         <div>
            <button
               type="submit"
               className="btn btn-primary"
               disabled={busy || !form.currentPassword || !form.password}
            >
               {busy ? "Changing…" : "Change password"}
            </button>
         </div>

         {changed && (
            <div className="settings-done">
               Password changed. Every other device was signed out - this one is
               still you.
            </div>
         )}
      </form>
   );
};

/* ---- devices ---------------------------------------------------------- */

const DevicesTab = () => {
   const { signOut } = useContext(UserContext);

   const [sessions, setSessions] = useState([]);
   const [apiStatus, setApiStatus] = useState(apiStatusConstants.inProgress);
   const [problem, setProblem] = useState(null);
   const [confirming, setConfirming] = useState(false);
   const [reloadCount, setReloadCount] = useState(0);

   useEffect(() => {
      let cancelled = false;

      listSessions()
         .then((data) => {
            if (cancelled) return;

            setSessions(data.sessions);
            setApiStatus(apiStatusConstants.success);
         })
         .catch(() => {
            if (!cancelled) setApiStatus(apiStatusConstants.failure);
         });

      return () => {
         cancelled = true;
      };
   }, [reloadCount]);

   const onClickRevoke = async (id) => {
      setProblem(null);

      try {
         await revokeSession(id);
         setReloadCount((count) => count + 1);
      } catch (error) {
         setProblem(apiError(error).message);
      }
   };

   const others = sessions.filter((session) => !session.current).length;

   const renderRows = () =>
      sessions.map((session) => (
         <div className="settings-device-row" key={session.id}>
            <div className="settings-device-name">
               <span
                  className={
                     session.current ? "settings-device-current" : undefined
                  }
               >
                  {session.device.browser || "Unknown browser"}
                  {session.device.os ? ` on ${session.device.os}` : ""}
               </span>

               {session.current && (
                  <span className="tag tag-accent">This device</span>
               )}
            </div>

            <span className="settings-device-ip">{session.ip || "—"}</span>
            <span className="settings-device-when">
               {formatWhen(session.lastUsedAt)}
            </span>
            <span className="settings-device-when">
               {formatWhen(session.signedInAt)}
            </span>

            <span className="settings-device-action">
               {!session.current && (
                  <button
                     type="button"
                     className="btn btn-ghost settings-device-button"
                     onClick={() => onClickRevoke(session.id)}
                  >
                     Sign out
                  </button>
               )}
            </span>
         </div>
      ));

   const renderDevices = () => {
      switch (apiStatus) {
         case apiStatusConstants.success:
            return (
               <>
                  <div className="settings-device-head">
                     <span>Device</span>
                     <span>IP</span>
                     <span>Last used</span>
                     <span>Signed in</span>
                     <span />
                  </div>

                  {renderRows()}
               </>
            );
         case apiStatusConstants.failure:
            return (
               <Notice>
                  We could not load your devices. Reload the page to try again.
               </Notice>
            );
         case apiStatusConstants.inProgress:
            return <p className="cj-muted">Loading devices…</p>;
         default:
            return null;
      }
   };

   return (
      <div>
         <div className="settings-device-toolbar">
            <p className="settings-device-count">
               {sessions.length === 1
                  ? "Signed in on this device only."
                  : `Signed in on ${sessions.length} devices.`}
            </p>

            <button
               type="button"
               className="btn btn-secondary"
               onClick={() => setConfirming(true)}
               disabled={others === 0}
            >
               Sign out everywhere
            </button>
         </div>

         <Notice>{problem}</Notice>

         {renderDevices()}

         {/* Signing out everywhere takes this device with it, so it asks
             first. */}
         {confirming && (
            <div className="dialog-backdrop">
               <div className="dialog">
                  <div className="dialog-title">Sign out everywhere?</div>

                  <div className="dialog-body">
                     Every device is signed out, including this one. You’ll land
                     back at sign-in.
                  </div>

                  <div className="dialog-actions">
                     <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setConfirming(false)}
                     >
                        Cancel
                     </button>

                     <button
                        type="button"
                        className="btn btn-primary"
                        onClick={signOut}
                     >
                        Sign out everywhere
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

/* ---- the page --------------------------------------------------------- */

const PANELS = {
   account: AccountTab,
   password: PasswordTab,
   devices: DevicesTab,
};

const SettingsPage = () => {
   const [tab, setTab] = useState("account");

   const Panel = PANELS[tab];

   return (
      <main className="cj-main-settings">
         <h1 className="cj-page-title">Settings</h1>

         <div className="settings-layout">
            <aside className="settings-tabs">
               {TABS.map((item) => (
                  <button
                     type="button"
                     key={item.id}
                     className={
                        item.id === tab
                           ? "settings-tab settings-tab-active"
                           : "settings-tab"
                     }
                     onClick={() => setTab(item.id)}
                  >
                     {item.label}
                  </button>
               ))}
            </aside>

            <section className="settings-content">
               <Panel />
            </section>
         </div>
      </main>
   );
};

export default SettingsPage;
