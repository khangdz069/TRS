FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /workspace
COPY backend/pom.xml backend/pom.xml
COPY backend/src backend/src
RUN mvn -f backend/pom.xml -DskipTests package

FROM eclipse-temurin:21-jre

WORKDIR /app
COPY --from=build /workspace/backend/target/backend-0.0.1-SNAPSHOT.jar app.jar

RUN mkdir -p /app/uploads

ENV PORT=5102
ENV UPLOAD_DIR=/app/uploads

EXPOSE 5102

CMD ["java", "-jar", "app.jar"]
