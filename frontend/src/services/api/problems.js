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

export { listProblems, listTags, getProblem };
