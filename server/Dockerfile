# # Use official Node.js runtime as a parent image
# FROM node:18-alpine

# # Set working directory inside container
# WORKDIR /usr/src/app

# # Copy package.json and package-lock.json first (for caching)
# COPY package*.json ./

# # Install dependencies
# RUN npm install

# # Copy rest of the app source code
# COPY . .

# # Expose the port your app listens on (default 5000)
# EXPOSE 5000

# # Command to run the app
# CMD ["node", "server.js"]


# Use official Node.js image
FROM node:18

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all backend files to container
COPY . .

# Expose all required ports
EXPOSE 5000 5001 5002

# Start all 3 node processes together
CMD ["sh", "-c", "node server.js & node Launcher/backend.js & node Launcher/launcher.js"]
