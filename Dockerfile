# ── build stage: compile the Vite app ────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── runtime stage: serve the static build with nginx ─────────────
FROM nginx:1.27-alpine

# Replace the default config with our non-root, port-8080 setup
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the built site only
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist /usr/share/nginx/html

# Run as uid 1000 / gid 0 to match the cluster security context
RUN chown -R 1000:0 /usr/share/nginx/html /var/cache/nginx \
    && chmod -R g+rwX /var/cache/nginx \
    && touch /tmp/nginx.pid \
    && chown 1000:0 /tmp/nginx.pid

USER 1000:0

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
