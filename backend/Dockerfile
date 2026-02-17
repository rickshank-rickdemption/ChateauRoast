FROM php:8.2-cli-alpine

RUN docker-php-ext-install sockets

WORKDIR /app

COPY backend /app/backend

EXPOSE 8080

CMD ["php", "backend/server.php"]
