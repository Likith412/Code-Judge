import { useEffect, useRef, useState } from "react";

import "./index.css";

// Under five minutes left, the clock turns red.
const WARN_MS = 5 * 60 * 1000;

const pad = (number) => String(number).padStart(2, "0");

// "2d 03:14:05", or "03:14:05" when under a day.
function formatLeft(ms) {
   const total = Math.max(0, Math.ceil(ms / 1000));
   const days = Math.floor(total / 86400);
   const clock = `${pad(Math.floor((total % 86400) / 3600))}:${pad(
      Math.floor((total % 3600) / 60),
   )}:${pad(total % 60)}`;

   return days ? `${days}d ${clock}` : clock;
}

const phaseAt = (now, start, end) =>
   now < start ? "UPCOMING" : now >= end ? "ENDED" : "LIVE";

// Counts to the start, then the end, on server time (offset = server minus local).
const ContestTimer = (props) => {
   const {
      startTime,
      endTime,
      offset = 0,
      compact = false,
      onPhaseChange,
   } = props;

   const start = new Date(startTime).getTime();
   const end = new Date(endTime).getTime();

   const [now, setNow] = useState(() => Date.now() + offset);

   useEffect(() => {
      const timer = setInterval(() => setNow(Date.now() + offset), 1000);

      return () => clearInterval(timer);
   }, [offset]);

   const phase = phaseAt(now, start, end);

   // Tells the page once per boundary, so it can open or close the questions.
   const lastPhase = useRef(phase);

   useEffect(() => {
      if (phase === lastPhase.current) return;

      lastPhase.current = phase;
      onPhaseChange?.(phase);
   }, [phase, onPhaseChange]);

   const left = phase === "UPCOMING" ? start - now : end - now;
   const warn = phase === "LIVE" && left <= WARN_MS;

   const label = {
      UPCOMING: "Starts in",
      LIVE: compact ? "Live ·" : "Time left",
      ENDED: "Ended",
   }[phase];

   const className = [
      "contest-timer",
      `contest-timer-${phase.toLowerCase()}`,
      compact && "contest-timer-compact",
      warn && "contest-timer-warn",
   ]
      .filter(Boolean)
      .join(" ");

   return (
      <span className={className} role="timer">
         <span className="contest-timer-label">{label}</span>
         {phase !== "ENDED" && (
            <span className="contest-timer-value">
               {formatLeft(left)}
               {compact && phase === "LIVE" && " left"}
            </span>
         )}
      </span>
   );
};

export default ContestTimer;
