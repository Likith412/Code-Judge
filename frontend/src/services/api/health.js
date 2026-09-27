import client from "./client";

function getHealth() {
   return client.get("/health").then((response) => response.data);
}

export { getHealth };
