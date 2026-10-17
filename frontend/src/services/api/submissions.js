import client from "./client";

// Run sends isSampleRun true. The answer comes back QUEUED.
function createSubmission(body) {
   return client.post("/submissions", body).then((response) => response.data);
}

function getSubmission(id) {
   return client.get(`/submissions/${id}`).then((response) => response.data);
}

// Your own Submit history, newest first. Empty filters are left off the url.
function listMySubmissions(query = {}) {
   const params = Object.fromEntries(
      Object.entries(query).filter(([, value]) => value !== "" && value != null),
   );

   return client
      .get("/submissions/me", { params })
      .then((response) => response.data);
}

export { createSubmission, getSubmission, listMySubmissions };
