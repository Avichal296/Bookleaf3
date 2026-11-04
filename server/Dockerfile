FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm ci
COPY server server
RUN npx prisma generate --schema=server/prisma/schema.prisma && npm run build -w server
EXPOSE 4000
CMD ["sh","-c","npx prisma migrate deploy --schema=server/prisma/schema.prisma && npm run prisma:seed -w server && npm run start -w server"]
