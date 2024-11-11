FROM node:14

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . .
 
ENV PGUSER="postgres" \
    PGPASSWORD="PASSWPRD" \
    PGHOST="localhost" \
    PGDATABASE="demo"

WORKDIR /app/backend

EXPOSE 3000

# RUN npm run setup

CMD ["node", "server.js"]
