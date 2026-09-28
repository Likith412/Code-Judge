// Short, readable times for the device list. Relative while it is recent,
// because "4 minutes ago" answers "is that me right now?" and a timestamp
// does not. Older than a day, the date is the more useful thing.
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
   day: "numeric",
   month: "short",
});

function formatWhen(isoDate) {
   if (!isoDate) return "";

   const date = new Date(isoDate);

   if (Number.isNaN(date.getTime())) return "";

   const minutes = Math.round((Date.now() - date.getTime()) / 60000);

   if (minutes < 1) return "just now";
   if (minutes < 60) return `${minutes} min ago`;

   const hours = Math.round(minutes / 60);

   if (hours < 24) return `${hours} h ago`;

   return dateFormatter.format(date);
}

export { formatWhen };
