# ================================
# BUILD STAGE
# ================================
# Use official Maven image to build
FROM maven:3.9-eclipse-temurin-21 AS build

# Set working directory
WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests


# ================================
# RUNTIME STAGE (API Mode)
# ================================
# Use official OpenJDK image for runtime
FROM eclipse-temurin:21-jre-alpine AS api

# Set working directory
WORKDIR /app

# Copy the built JAR from build stage
COPY --from=build /app/target/*.jar app.jar

# Install curl for healthcheck
RUN apk add --no-cache curl

# Expose port 8000
EXPOSE 8000

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]


# ================================
# RUNTIME STAGE (Worker Mode)
# ================================
FROM eclipse-temurin:21-jre-alpine AS worker

# Set working directory
WORKDIR /app

# Copy JAR from build stage
COPY --from=build /app/target/*.jar app.jar

# JVM memory limits for worker
ENV JAVA_OPTS="-Xms256m -Xmx512m"

# Flag to indicate worker mode (optional, for code logic)
ENV WORKER_MODE=true

# IMPORTANT:
# Disable web server because this is a background worker
ENTRYPOINT ["java", "-jar", "app.jar", "--spring.main.web-application-type=none"]
