FROM oven/bun:1.3.9 AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/tui/package.json ./apps/tui/package.json
COPY packages/review/package.json ./packages/review/package.json
COPY packages/todoist/package.json ./packages/todoist/package.json
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 3000
