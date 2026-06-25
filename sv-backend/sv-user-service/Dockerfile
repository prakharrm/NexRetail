# Base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy shared package first (since context is the root directory)
COPY sv-shared/package.json ./sv-shared/
COPY sv-shared/tsconfig.json ./sv-shared/
COPY sv-shared/src/ ./sv-shared/src/

# Copy service package.json
COPY sv-backend/sv-user-service/package*.json ./sv-backend/sv-user-service/

# Install shared dependencies and build it
WORKDIR /app/sv-shared
RUN npm install
RUN npm run build

# Install service dependencies
WORKDIR /app/sv-backend/sv-user-service
# (Assuming npm init has been run, otherwise just npm install will fail without package.json, 
# but this is a boilerplate to be filled later)
RUN if [ -f "package.json" ]; then npm install; fi

# Copy the rest of the application
COPY sv-backend/sv-user-service/ ./

# Expose port
EXPOSE 3002

# Start the server
CMD ["echo", "User service not fully implemented yet"]
