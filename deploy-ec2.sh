#!/bin/bash
# Exit on error
set -e

echo "Updating system and installing dependencies..."
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y unzip docker.io docker-compose curl

echo "Unzipping project files..."
unzip -o predia.zip -d predia
cd predia

echo "Adding MySQL Database to Docker Compose..."
cat << 'EOF' > docker-compose.override.yml
services:
  db:
    image: mysql:8.0
    container_name: predia-db
    environment:
      MYSQL_ROOT_PASSWORD: SecurePassword123!
      MYSQL_DATABASE: predia
      MYSQL_USER: predia_app
      MYSQL_PASSWORD: SecurePassword123!
    ports:
      - "3306:3306"
    volumes:
      - predia_db_data:/var/lib/mysql
    networks:
      - predia-net
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 10s
      retries: 10

  diabetes-ai:
    depends_on:
      db:
        condition: service_healthy
    env_file:
      - .env.prod

volumes:
  predia_db_data:
EOF

echo "Configuring environment variables for production..."
cp .env.local .env.prod
# Replace localhost with 'db' for the docker network
sed -i 's/localhost:3306/db:3306/g' .env.prod
# Ensure domain is correct for frontend
sed -i 's/http:\/\/localhost:3000/http:\/\/prediaa.duckdns.org/g' .env.prod

echo "Starting Docker containers..."
sudo systemctl enable docker
sudo systemctl start docker
sudo docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d --build

echo "Waiting for Database to initialize..."
sleep 20

echo "Initializing Database Schema..."
sudo docker exec diabetes-ai npx prisma db push --accept-data-loss

echo "Seeding Database with sample users..."
sudo docker exec diabetes-ai npx tsx prisma/seed.ts || echo "Seed already applied or failed"

echo "Deployment Successful! Platform is running on http://13.217.96.243:3000"
