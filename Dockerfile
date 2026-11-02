FROM node:22-alpine

WORKDIR /app

# Copy project files
COPY package*.json ./
COPY content/ ./content/
COPY drizzle/ ./drizzle/
COPY lib/ ./lib/
COPY public/ ./public/
COPY server/ ./server/

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/app/data/sdr_lab.sqlite
ENV TRAINING_OWNER_EMAIL=owner@example.com
ENV TRAINING_ADMIN_EMAILS='["admin@example.com"]'

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "server/standalone-server.mjs"]
