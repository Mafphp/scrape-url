# Build stage
FROM node:22-alpine AS build

WORKDIR /app

ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build || echo "skip if no build step"

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install Chromium dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    udev \
    bash \
    dumb-init \
    libc6-compat \
    xvfb \
    libx11 \
    libxcomposite \
    libxdamage \
    libxrandr \
    libxi \
    libxtst \
    at-spi2-core \
    gtk+3.0

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV NODE_ENV=production

COPY --from=build /app /app

RUN npm install --production

EXPOSE 4000

CMD ["node", "app.js"]
