# Multi-stage build for production image
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
# optional build step if you have bundling
# RUN npm run build || true

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["node", "src/server.js"]
