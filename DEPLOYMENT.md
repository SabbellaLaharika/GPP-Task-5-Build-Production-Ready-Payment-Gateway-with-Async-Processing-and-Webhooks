# Deployment Guide

Complete guide for deploying the Payment Gateway application using Docker.

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Deployment Options](#deployment-options)
- [Updating Images](#updating-images)
- [Monitoring](#monitoring)
- [Backup & Restore](#backup--restore)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### For End Users (Pre-built Images)

```bash
# 1. Clone repository
git clone https://github.com/SabbellaLaharika/GPP-Task-4-Build-Payment-Gateway-with-Multi-Method-Processing-and-Hosted-Checkout.git
cd GPP-Task-4-Build-Payment-Gateway-with-Multi-Method-Processing-and-Hosted-Checkout

# 2. Start all services
docker-compose up -d

# 3. Verify services
docker-compose ps

# 4. Access applications
# Dashboard: http://localhost:3000
# Checkout: http://localhost:3001
# API: http://localhost:8000
```

---

## 📋 Prerequisites

### Required Software

1. **Docker Desktop** (v20.10+)
   - Windows: https://docs.docker.com/desktop/install/windows-install/
   - Mac: https://docs.docker.com/desktop/install/mac-install/
   - Linux: https://docs.docker.com/desktop/install/linux-install/

2. **Docker Compose** (v2.0+)
   - Included with Docker Desktop
   - Linux standalone: https://docs.docker.com/compose/install/

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 4 GB | 8 GB |
| CPU | 2 cores | 4 cores |
| Disk Space | 2 GB free | 5 GB free |
| OS | Windows 10/11, macOS 10.15+, Linux | Any |

### Network Requirements

**Ports Used:**
- 3000 - Frontend Dashboard
- 3001 - Checkout Page
- 8000 - Backend API
- 5440 - PostgreSQL (external access)

**Ensure these ports are not in use:**
```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :8000
netstat -ano | findstr :5440

# Linux/Mac
lsof -i :3000
lsof -i :3001
lsof -i :8000
lsof -i :5440
```

---

## ⚙️ Configuration

### Environment Variables

1. **Copy the example environment file:**
```bash
cp .env.example .env
```

2. **Edit `.env` with your values:**
```env
# Database
POSTGRES_DB=payment_gateway
POSTGRES_USER=gateway_user
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_PORT=5440

# Backend
BACKEND_PORT=8000

# Frontend
FRONTEND_PORT=3000
CHECKOUT_PORT=3001
```

### Docker Compose Configuration

The `docker-compose.yml` pulls pre-built images from Docker Hub:

```yaml
services:
  backend:
    image: sabbellalaharika/payment-gateway-backend:latest
  frontend:
    image: sabbellalaharika/payment-gateway-frontend:latest
  checkout:
    image: sabbellalaharika/payment-gateway-checkout:latest
```

**For custom builds**, modify to:
```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
```

---

## 🐳 Deployment Options

### Option 1: Using Pre-built Images (Recommended)

**Fastest deployment - pulls from Docker Hub**

```bash
# Start services
docker-compose up -d

# First run takes 2-3 minutes to pull images
# Subsequent runs take seconds
```

### Option 2: Building from Source

**Use when you've modified the code**

```bash
# Build and start
docker-compose up --build -d

# First build takes 5-10 minutes
# Subsequent builds use cache
```

### Option 3: Development Mode

**For active development with hot reload**

```bash
# Start only database
docker-compose up -d postgres

# Run backend locally
cd backend
mvn spring-boot:run

# Run frontend locally
cd frontend
npm start

# Run checkout locally
cd checkout-page
npm start
```

---

## 🔄 Updating Images

### Pull Latest Images

```bash
# Stop services
docker-compose down

# Pull latest images
docker-compose pull

# Start with new images
docker-compose up -d
```

### Rebuild Custom Images

```bash
# Rebuild specific service
docker-compose build backend

# Rebuild all services
docker-compose build

# Rebuild without cache
docker-compose build --no-cache
```

### Push to Docker Hub (For Developers)

```bash
# Login to Docker Hub
docker login

# Build images
docker-compose build

# Tag images
docker tag payment-gateway-backend:latest your-username/payment-gateway-backend:latest

# Push images
docker push your-username/payment-gateway-backend:latest
docker push your-username/payment-gateway-frontend:latest
docker push your-username/payment-gateway-checkout:latest
```

---

## 📊 Monitoring

### View Container Status

```bash
# List running containers
docker-compose ps

# Expected output:
# NAME                        STATUS
# payment_gateway_db          Up (healthy)
# payment_gateway_backend     Up (healthy)
# payment_gateway_frontend    Up
# payment_gateway_checkout    Up
```

### View Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs checkout
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Resource Usage

```bash
# View resource usage
docker stats

# View disk usage
docker system df
```

### Health Checks

```bash
# Check API health
curl http://localhost:8000/health

# Expected response:
# {
#   "status": "healthy",
#   "database": "connected",
#   "timestamp": "2026-01-08T10:30:00Z"
# }

# Check frontend
curl -I http://localhost:3000

# Check checkout
curl -I http://localhost:3001
```

---

## 💾 Backup & Restore

### Database Backup

```bash
# Create backup
docker exec payment_gateway_db pg_dump \
  -U gateway_user \
  -d payment_gateway \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
docker exec payment_gateway_db pg_dump \
  -U gateway_user \
  -d payment_gateway \
  | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Database Restore

```bash
# From SQL file
docker exec -i payment_gateway_db psql \
  -U gateway_user \
  -d payment_gateway \
  < backup_20260108_103000.sql

# From compressed file
gunzip -c backup_20260108_103000.sql.gz | \
docker exec -i payment_gateway_db psql \
  -U gateway_user \
  -d payment_gateway
```

### Volume Backup

```bash
# Backup PostgreSQL volume
docker run --rm \
  -v payment-gateway_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_volume_backup.tar.gz -C /data .
```

### Volume Restore

```bash
# Restore PostgreSQL volume
docker run --rm \
  -v payment-gateway_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres_volume_backup.tar.gz -C /data
```

---

## 🐛 Troubleshooting

### Services Won't Start

**Problem:** Containers exit immediately

**Solution:**
```bash
# Check logs for errors
docker-compose logs

# Remove all containers and volumes
docker-compose down -v

# Restart fresh
docker-compose up -d
```

### Port Already in Use

**Problem:** `Error: bind: address already in use`

**Solution:**
```bash
# Find process using port
netstat -ano | findstr :8000  # Windows
lsof -i :8000  # Linux/Mac

# Kill process or change port in docker-compose.yml
ports:
  - "8001:8000"  # Change external port
```

### Database Connection Failed

**Problem:** Backend can't connect to database

**Solution:**
```bash
# Check database is healthy
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres

# Wait for health check
docker-compose ps
```

### Images Won't Pull

**Problem:** `Error pulling image`

**Solution:**
```bash
# Check internet connection
ping hub.docker.com

# Login to Docker Hub
docker login

# Pull manually
docker pull sabbellalaharika/payment-gateway-backend:latest

# Use proxy if behind firewall (edit ~/.docker/config.json)
```

### Out of Disk Space

**Problem:** `no space left on device`

**Solution:**
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything unused
docker system prune -a --volumes

# Check space
docker system df
```

### Backend Health Check Failing

**Problem:** Backend container unhealthy

**Solution:**
```bash
# View backend logs
docker-compose logs backend

# Check if database is ready
docker exec payment_gateway_db pg_isready -U gateway_user

# Restart backend
docker-compose restart backend

# Access backend shell
docker exec -it payment_gateway_backend sh
curl localhost:8000/health
```

### Frontend/Checkout Not Loading

**Problem:** Blank page or connection refused

**Solution:**
```bash
# Check container is running
docker-compose ps frontend

# View logs
docker-compose logs frontend

# Check nginx configuration
docker exec payment_gateway_frontend cat /etc/nginx/conf.d/default.conf

# Restart frontend
docker-compose restart frontend

# Clear browser cache and retry
```

---

## 🔧 Advanced Configuration

### Custom Network

```yaml
networks:
  payment-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Resource Limits

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Multiple Environments

```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 📞 Support

### Getting Help

1. **Check Logs First:**
   ```bash
   docker-compose logs
   ```

2. **Verify Configuration:**
   ```bash
   docker-compose config
   ```

3. **Test Connectivity:**
   ```bash
   docker exec payment_gateway_backend ping postgres
   ```

4. **Create GitHub Issue:**
   - Include: logs, docker-compose.yml, system info
   - URL: https://github.com/SabbellaLaharika/GPP-Task-4-Build-Payment-Gateway-with-Multi-Method-Processing-and-Hosted-Checkout/issues

---

## 🎯 Production Checklist

Before deploying to production:

- [ ] Change default database password
- [ ] Update API credentials
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up monitoring & alerts
- [ ] Configure automated backups
- [ ] Review security settings
- [ ] Test disaster recovery
- [ ] Document custom configuration
- [ ] Train operations team

---

**For questions, open an issue on GitHub or contact the maintainer.**