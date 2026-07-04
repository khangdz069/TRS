FROM node:20-alpine

WORKDIR /app

# Install dependencies first (leverages Docker cache)
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Next.js listens on port 3100 by default
EXPOSE 3100

ENV PORT=3100
ENV HOSTNAME="0.0.0.0"

# Start the Next.js server
CMD ["npm", "run", "start"]
