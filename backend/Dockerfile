FROM node:20-alpine

WORKDIR /app

# Copy package files and dynamic config
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy source code files
COPY . .

# Expose API port
EXPOSE 5000

# Run API server
CMD ["npm", "start"]
