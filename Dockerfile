
# Use lighter Alpine image
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Build the TypeScript code
RUN npm run build

# Create directory for tokens (persistence volume should be mounted here for prod)
RUN mkdir -p /root/.config/fabits-mcp/tokens

# Expose the API port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
