FROM node:22-slim

WORKDIR /app

# Install ONLY the minimal runtime dependencies required by app.js (avoids frontend Vite/React peer-dep conflicts)
RUN printf '{"name":"moviebox-api","private":true,"type":"module","dependencies":{"express":"^4.21.2","dotenv":"^17.2.3"}}\n' > package.json \
    && npm install --omit=dev --no-audit --no-fund

COPY app.js ./

RUN mkdir -p /app/data && chmod -R 777 /app/data

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["node", "app.js"]
