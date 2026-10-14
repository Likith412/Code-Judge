import client from "./client";

// Run sends isSampleRun true. The answer comes back QUEUED.
function createSubmission(body) {
   return client.post("/submissions", body).then((response) => response.data);
}

function getSubmission(id) {
   return client.get(`/submissions/${id}`).then((response) => response.data);
}

export { createSubmission, getSubmission };
