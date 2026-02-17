FROM php:8.2-cli-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev \
    && docker-php-ext-install sockets \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend /app/backend

EXPOSE 8080

CMD ["php", "backend/server.php"]
