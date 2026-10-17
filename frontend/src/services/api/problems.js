import client from "./client";

// Lists go on the wire as a comma string, which is what the API reads.
function listProblems(query = {}) {
   const params = {};

   for (const [key, value] of Object.entries(query)) {
      const text = Array.isArray(value) ? value.join(",") : value;

      if (text !== "" && text !== undefined && text !== null) {
         params[key] = text;
      }
   }

   return client.get("/problems", { params }).then((response) => response.data);
}

// Every tag with how many problems carry it, for the filter rail.
function listTags(query = {}) {
   return client
      .get("/problems/tags", { params: query })
      .then((response) => response.data);
}

function getProblem(slug) {
   return client.get(`/problems/${slug}`).then((response) => response.data);
}

/* ---- setter and admin only ------------------------------------------- */

const data = (response) => response.data;

// By slug, as in the editor's url. Every write after this goes by id.
const getProblemForEdit = (slug) =>
   client.get(`/problems/${slug}/edit`).then(data);

const createProblem = (body) => client.post("/problems", body).then(data);

const updateProblem = (id, body) =>
   client.patch(`/problems/${id}`, body).then(data);

const deleteProblem = (id) => client.delete(`/problems/${id}`).then(data);

// Every case, hidden ones included, in run order.
const listTestCases = (id) =>
   client.get(`/problems/${id}/test-cases`).then(data);

const addTestCase = (id, body) =>
   client.post(`/problems/${id}/test-cases`, body).then(data);

const updateTestCase = (id, caseId, body) =>
   client.patch(`/problems/${id}/test-cases/${caseId}`, body).then(data);

const deleteTestCase = (id, caseId) =>
   client.delete(`/problems/${id}/test-cases/${caseId}`).then(data);

export {
   listProblems,
   listTags,
   getProblem,
   getProblemForEdit,
   createProblem,
   updateProblem,
   deleteProblem,
   listTestCases,
   addTestCase,
   updateTestCase,
   deleteTestCase,
};
