FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

# Install arduino-cli for compilation support
RUN apk add --no-cache curl bash python3 py3-pip && \
    curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh && \
    mv bin/arduino-cli /usr/local/bin/ && \
    arduino-cli core update-index && \
    arduino-cli core install arduino:avr || true

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

RUN mkdir -p logs /tmp/aiot-compile

EXPOSE 4000
CMD ["node", "dist/index.js"]
