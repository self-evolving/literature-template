FROM node:22-slim AS builder
WORKDIR /usr/src/app
COPY package.json .
COPY package-lock.json* .
COPY quartz/ ./quartz/
COPY quartz.lock.json .
RUN npm ci && npm run install-plugins

FROM node:22-slim
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/ /usr/src/app/
COPY . .
CMD ["npm", "run", "quartz", "--", "build", "--serve"]
