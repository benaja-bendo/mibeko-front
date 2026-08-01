FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Définir les variables d'environnement au moment du build (pour Vite)
ARG VITE_LARAVEL_API_URL
ARG VITE_PYTHON_API_URL
ARG VITE_UMAMI_URL
ARG VITE_UMAMI_WEBSITE_ID
ENV VITE_LARAVEL_API_URL=$VITE_LARAVEL_API_URL
ENV VITE_PYTHON_API_URL=$VITE_PYTHON_API_URL
ENV VITE_UMAMI_URL=$VITE_UMAMI_URL
ENV VITE_UMAMI_WEBSITE_ID=$VITE_UMAMI_WEBSITE_ID

RUN npm run build

FROM nginx:1.27-alpine

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

