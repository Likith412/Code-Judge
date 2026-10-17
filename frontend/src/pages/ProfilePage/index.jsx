import { useContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getProfile } from "../../services/api/users";
import { apiError } from "../../services/api/client";
import DifficultyTag from "../../components/DifficultyTag";
import FailureView from "../../components/FailureView";
import UserContext from "../../context/UserContext";
import { LANG_LABEL } from "../../utils/languages";

import "./index.css";

const apiStatusConstants = {
   initial: "INITIAL",
   success: "SUCCESS",
   failure: "FAILURE",
   inProgress: "IN_PROGRESS",
};

const joinedFormatter = new Intl.DateTimeFormat("en-GB", {
   month: "short",
   year: "numeric",
});

// Accept rate from the two counters. Nothing to show before the first submit.
const rateText = ({ totalSubmissions, acceptedSubmissions }) =>
   totalSubmissions
      ? `${Math.round((acceptedSubmissions / totalSubmissions) * 100)}% accept rate`
      : "no submissions yet";

const ProfilePage = () => {
   const { username } = useParams();
   const { user: me } = useContext(UserContext);

   const [profile, setProfile] = useState(null);
   const [apiStatus, setApiStatus] = useState(apiStatusConstants.initial);
   const [failure, setFailure] = useState(null);
   const [reloadCount, setReloadCount] = useState(0);

   useEffect(() => {
      let cancelled = false;

      const load = async () => {
         setApiStatus(apiStatusConstants.inProgress);

         try {
            const data = await getProfile(username);

            if (cancelled) return;

            setProfile(data.user);
            setApiStatus(apiStatusConstants.success);
         } catch (error) {
            if (cancelled) return;

            setFailure(apiError(error));
            setApiStatus(apiStatusConstants.failure);
         }
      };

      load();

      return () => {
         cancelled = true;
      };
   }, [username, reloadCount]);

   const renderStats = (stats) => {
      // Most used first. At most three, one per language.
      const languages = Object.entries(stats.languageCounts).sort(
         (a, b) => b[1] - a[1],
      );

      return (
         <div className="profile-stats">
            <div className="profile-stat">
               <div className="profile-stat-label">Solved</div>
               <div className="profile-stat-number">{stats.solvedTotal}</div>
               <div className="profile-stat-note">
                  Easy {stats.solvedEasy} · Medium {stats.solvedMedium} · Hard{" "}
                  {stats.solvedHard}
               </div>
            </div>

            <div className="profile-stat">
               <div className="profile-stat-label">Submissions</div>
               <div className="profile-stat-number">
                  {stats.totalSubmissions}
               </div>
               <div className="profile-stat-note">
                  {stats.acceptedSubmissions} accepted · {rateText(stats)}
               </div>
            </div>

            <div className="profile-stat">
               <div className="profile-stat-label">Languages</div>

               <div className="profile-langs">
                  {languages.length === 0 && (
                     <span className="profile-stat-note">None yet</span>
                  )}

                  {languages.map(([language, count]) => (
                     <div className="profile-lang" key={language}>
                        <span>{LANG_LABEL[language] || language}</span>
                        <span className="profile-stat-note">{count}</span>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      );
   };

   const renderSolved = () => {
      if (profile.solvedProblems.length === 0) {
         return (
            <p className="profile-none">
               Nothing solved yet.{" "}
               {me?.username === profile.username && (
                  <Link to="/problems?difficulty=EASY">
                     Start with an Easy problem →
                  </Link>
               )}
            </p>
         );
      }

      return (
         <div className="profile-solved">
            {profile.solvedProblems.map((problem) => (
               <Link
                  className="profile-solved-row"
                  key={problem.slug}
                  to={`/problems/${problem.slug}`}
               >
                  <span>{problem.title}</span>
                  <DifficultyTag difficulty={problem.difficulty} />
               </Link>
            ))}
         </div>
      );
   };

   const renderProfile = () => {
      const name = profile.displayName || profile.username;

      return (
         <main className="cj-main-profile">
            <header className="profile-header">
               <div className="profile-avatar">
                  {name.charAt(0).toUpperCase()}
               </div>

               <div className="profile-who">
                  <h1 className="profile-name">{name}</h1>
                  <div className="profile-handle">
                     @{profile.username} · Joined{" "}
                     {joinedFormatter.format(new Date(profile.createdAt))}
                  </div>
                  {profile.bio && <p className="profile-bio">{profile.bio}</p>}
               </div>
            </header>

            {renderStats(profile.stats)}

            <h6 className="profile-section">Solved problems</h6>
            {renderSolved()}
         </main>
      );
   };

   const renderMissing = () => (
      <main className="cj-main-narrow">
         <h1 className="cj-screen-title">No such user</h1>

         <p className="cj-prose">
            Nobody is called <span className="cj-num">@{username}</span>.
         </p>

         <Link className="btn btn-primary" to="/problems">
            Back to problems
         </Link>
      </main>
   );

   switch (apiStatus) {
      case apiStatusConstants.success:
         return renderProfile();
      case apiStatusConstants.failure:
         return failure.status === 404 ? (
            renderMissing()
         ) : (
            <FailureView
               message={failure.message}
               onRetry={() => setReloadCount((count) => count + 1)}
            />
         );
      case apiStatusConstants.inProgress:
         return (
            <main className="cj-main-profile">
               <p className="profile-loading">Loading profile…</p>
            </main>
         );
      default:
         return null;
   }
};

export default ProfilePage;
