import { Link } from "react-router-dom";

import "./index.css";

// One contest's rankings. Your row is marked, first place gets the accent.
const RankingTable = ({ rows, me }) => (
   <div className="ranking">
      <div className="ranking-head">
         <span>Rank</span>
         <span>User</span>
         <span className="ranking-num">Score</span>
         <span className="ranking-num">Penalty</span>
         <span className="ranking-solved">Solved</span>
      </div>

      {rows.length === 0 && (
         <p className="ranking-empty">No one has joined yet.</p>
      )}

      {rows.map((row, index) => (
         <div
            key={row.username || index}
            className={
               me && row.username === me
                  ? "ranking-row ranking-me"
                  : "ranking-row"
            }
         >
            <span
               className={
                  row.rank === 1 ? "ranking-rank ranking-first" : "ranking-rank"
               }
            >
               {row.rank}
            </span>

            <span className="ranking-user">
               {row.username ? (
                  <Link to={`/u/${row.username}`}>@{row.username}</Link>
               ) : (
                  <span className="ranking-muted">Unavailable account</span>
               )}
            </span>

            <span className="ranking-num ranking-score">{row.score}</span>
            <span className="ranking-num">{row.penaltyMinutes} min</span>
            <span className="ranking-solved">
               {row.solved.length === 0 ? (
                  <span className="ranking-muted">-</span>
               ) : (
                  row.solved.map((item) => (
                     <span className="ranking-chip" key={item.label}>
                        <strong>{item.label}</strong> {item.solvedAtMin}m
                        {item.wrongAttempts > 0 && (
                           <span className="ranking-muted">
                              {" "}
                              +{item.wrongAttempts}
                           </span>
                        )}
                     </span>
                  ))
               )}
            </span>
         </div>
      ))}
   </div>
);

export default RankingTable;
