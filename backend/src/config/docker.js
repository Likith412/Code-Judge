const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Docker = require("dockerode");

const { DOCKER_HOST } = require("./env");

// Docker Desktop keeps its socket in the home folder, Linux in /var/run.
const SOCKETS = [
   path.join(os.homedir(), ".docker", "run", "docker.sock"),
   "/var/run/docker.sock",
];

// DOCKER_HOST wins (dockerode reads it); else the first socket that really exists.
function connection() {
   if (DOCKER_HOST) return undefined;

   const socketPath = SOCKETS.find((candidate) => fs.existsSync(candidate));

   return socketPath ? { socketPath } : undefined;
}

module.exports = new Docker(connection());
