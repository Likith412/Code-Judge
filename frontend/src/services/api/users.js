import client from "./client";

// A public profile. Works signed out too.
function getProfile(username) {
   return client
      .get(`/users/${encodeURIComponent(username)}`)
      .then((response) => response.data);
}

export { getProfile };
