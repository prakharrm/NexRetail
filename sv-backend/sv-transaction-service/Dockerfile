# Base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy shared package first (since context is the root directory)
COPY sv-shared/package.json ./sv-shared/
COPY sv-shared/tsconfig.json ./sv-shared/
COPY sv-shared/src/ ./sv-shared/src/

# Copy service package.json
COPY sv-backend/sv-transaction-service/package*.json ./sv-backend/sv-transaction-service/

# Install shared dependencies and build it
WORKDIR /app/sv-shared
RUN npm install
RUN npm run build

# Install service dependencies
WORKDIR /app/sv-backend/sv-transaction-service
RUN npm install

# Copy Prisma schema and generate client
COPY sv-backend/sv-transaction-service/prisma ./prisma/
RUN npx prisma generate

# Copy the rest of the application
COPY sv-backend/sv-transaction-service/ ./

# Expose port
EXPOSE 3001

# Start the server (assuming nodemon or node index.js)
CMD ["npx", "ts-node", "index.ts"]
