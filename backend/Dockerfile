# The API. docker compose builds and runs it; see docker-compose.yml.
FROM node:24-slim

WORKDIR /app
ENV NODE_ENV=production

# Dependencies first, so a code change does not reinstall them.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

# Never root. Docker access comes from the socket's group, added by compose.
USER node
EXPOSE 3000

CMD ["node", "src/server.js"]
