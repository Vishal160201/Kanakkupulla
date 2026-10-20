FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Install build tools for native dependencies
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install app dependencies (reproducible install from the lockfile)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Bundle app source
COPY . .

ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Required at runtime: WHATSAPP_BOT_SECRET (shared with the Next.js app).
# Optional: ALLOWED_ORIGIN (enables CORS for the listed origin(s)), PORT.
CMD [ "node", "server.js" ]
