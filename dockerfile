# === Builder Stage ===
FROM oven/bun:alpine AS builder

WORKDIR /app

# Copy package files for efficient caching - modified to handle different lock file names
COPY package.json ./
# Use a wildcard to handle different possible lock file names
COPY bun.lock* ./
# If using npm, copy package-lock.json too (optional)
COPY package-lock.json* ./

# Install dependencies
RUN bun install

# Copy the rest of the project files
COPY . .

# Build the application
RUN bun run build

# === Production Stage ===
FROM nginx:alpine AS production

# Copy the built app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]