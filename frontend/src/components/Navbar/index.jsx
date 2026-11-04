import { useContext } from "react";
import { Link, NavLink } from "react-router-dom";

import UserContext from "../../context/UserContext";
import { homePath } from "../../utils/home";

import "./index.css";

const SETTER_ROLES = ["SETTER", "ADMIN"];

const linkClass = ({ isActive }) =>
   isActive ? "cj-nav-link cj-nav-link-active" : "cj-nav-link";

const RestoringSession = () => (
   <>
      <span className="cj-skeleton cj-skeleton-name" />
      <span className="cj-skeleton cj-skeleton-avatar" />
   </>
);

const Navbar = (props) => {
   const { restoring } = props;

   const { user, signOut } = useContext(UserContext);

   const isSetter = Boolean(user) && SETTER_ROLES.includes(user.role);
   const isAdmin = user?.role === "ADMIN";

   return (
      <nav className="cj-nav">
         <Link to={homePath(user)} className="cj-brand">
            <span className="cj-brand-mark" />
            Code Judge
         </Link>

         {/* Each role gets its own links. Setters and admins do not solve. */}
         {isAdmin && (
            <>
               <NavLink to="/admin/users" className={linkClass}>
                  Users
               </NavLink>

               <NavLink to="/setter/problems" className={linkClass}>
                  Problems
               </NavLink>

               <NavLink to="/contests" className={linkClass}>
                  Contests
               </NavLink>

               <NavLink to="/admin/audit" className={linkClass}>
                  Audit log
               </NavLink>
            </>
         )}

         {isSetter && !isAdmin && (
            <>
               <NavLink to="/setter/problems" className={linkClass}>
                  Problems
               </NavLink>

               <NavLink to="/contests" className={linkClass}>
                  Contests
               </NavLink>
            </>
         )}

         {!isSetter && (
            <>
               <NavLink to="/problems" className={linkClass}>
                  Problems
               </NavLink>

               <NavLink to="/contests" className={linkClass}>
                  Contests
               </NavLink>

               {user && (
                  <NavLink to="/submissions" className={linkClass}>
                     Submissions
                  </NavLink>
               )}
            </>
         )}

         <div className="cj-nav-end">
            {restoring && <RestoringSession />}

            {!restoring && !user && (
               <>
                  <NavLink to="/login" className={linkClass}>
                     Sign in
                  </NavLink>

                  <Link to="/register" className="btn btn-primary">
                     Register
                  </Link>
               </>
            )}

            {!restoring && user && (
               <>
                  <Link to={`/u/${user.username}`} className="cj-me">
                     <span className="cj-avatar">
                        {user.username.charAt(0).toUpperCase()}
                     </span>

                     <span className="cj-me-name">{user.username}</span>
                     {/* Setters and admins see which role they are signed in as. */}
                     {user.role !== "USER" && (
                        <span
                           className={`cj-me-role cj-me-role-${user.role.toLowerCase()}`}
                        >
                           {user.role === "ADMIN" ? "Admin" : "Setter"}
                        </span>
                     )}
                  </Link>

                  <NavLink to="/settings" className={linkClass}>
                     Settings
                  </NavLink>

                  <button
                     type="button"
                     className="btn btn-ghost"
                     onClick={signOut}
                  >
                     Sign out
                  </button>
               </>
            )}
         </div>
      </nav>
   );
};

export default Navbar;
