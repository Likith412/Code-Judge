import client from "./client";

const data = (response) => response.data;
const listContests = (params) => client.get("/contests", { params }).then(data);
const getContest = (slug) => client.get(`/contests/${slug}`).then(data);
const getContestProblem = (slug, problemSlug) =>
   client.get(`/contests/${slug}/problems/${problemSlug}`).then(data);

const joinContest = (slug) => client.post(`/contests/${slug}/join`).then(data);

// Ends the contest early, for the person asking only.
const finishContest = (slug) =>
   client.post(`/contests/${slug}/finish`).then(data);

const createContest = (body) => client.post("/contests", body).then(data);
const updateContest = (id, body) =>
   client.patch(`/contests/${id}`, body).then(data);

const getRankings = (slug, params) =>
   client.get(`/contests/${slug}/rankings`, { params }).then(data);

export {
   listContests,
   getContest,
   getContestProblem,
   joinContest,
   finishContest,
   createContest,
   updateContest,
   getRankings,
};
