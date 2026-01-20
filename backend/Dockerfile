FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build
CMD ["node", "run-migrations.js"]
CMD ["node", "run-seed-data.js"]

# API Target
FROM base AS api
EXPOSE 8000
CMD ["node", "dist/app.js"]

# Worker Target
FROM base AS worker
CMD ["node", "dist/worker-entry.js"]
