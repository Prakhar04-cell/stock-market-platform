# Multi-stage build for BullRun Java Security & Analytics Service
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
EXPOSE 8081

# Add non-root user for container security
RUN addgroup -S bullrun && adduser -S bullrun -G bullrun
USER bullrun

COPY --from=build /app/target/java-security-service-1.0.0.jar app.jar

ENV SERVER_PORT=8081
ENV SPRING_PROFILES_ACTIVE=production

ENTRYPOINT ["java", "-XX:+UseG1GC", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
