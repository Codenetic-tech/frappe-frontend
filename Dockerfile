# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package definition files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the application files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage to nginx html folder
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration template for environment variable substitution
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 8081

CMD ["nginx", "-g", "daemon off;"]
