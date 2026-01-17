# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/mcp.json ./mcp.json
COPY --from=builder /app/README.md ./README.md
COPY --from=builder /app/PRIVACY.md ./PRIVACY.md

# Environment variables
ENV PORT=3333
ENV NODE_ENV=production

# Expose the port
EXPOSE 3333

# Start the server
CMD ["node", "dist/server/index.js"]
