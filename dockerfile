FROM node:14

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./

RUN npm install

COPY . .

# Environment variables (update PGHOST if using Fly.io Postgres)
ENV PGUSER="postgres" \
    PGPASSWORD="PASSWPRD" \
    PGHOST="localhost" \
    PGDATABASE="demo"

# Expose port 3000
EXPOSE 8080

# RUN npm run setup

# Run the backend
CMD ["node", "server.js"]
