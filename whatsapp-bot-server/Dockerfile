FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install build tools for native dependencies
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Expose port
EXPOSE 3001

# Command to run
CMD [ "npm", "start" ]
