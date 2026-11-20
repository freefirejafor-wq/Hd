FROM node:20-slim

WORKDIR /app

# Install dependencies & bundle standalone server
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY server.ts tsconfig.json ./
COPY src ./src

RUN npx esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=app.js \
    && mkdir -p /app/data \
    && chmod -R 777 /app/data

# Hugging Face Spaces uses port 7860 by default; Koyeb/Railway/VPS override via PORT env var
ENV NODE_ENV=production
ENV PORT=7860

EXPOSE 7860

CMD ["node", "app.js"]
