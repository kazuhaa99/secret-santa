FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Runtime: only the API dependencies, the server sources (run as TypeScript by Node) and the built page.
FROM node:22-alpine
ENV NODE_ENV=production NODE_NO_WARNINGS=1
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && mkdir -p data && chown node:node data
COPY server ./server
COPY --from=build /app/web/dist ./web/dist
USER node
EXPOSE 8787
CMD ["node", "server/index.ts"]
