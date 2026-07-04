FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /workspace
COPY backend-java/pom.xml backend-java/pom.xml
COPY backend-java/src backend-java/src
RUN mvn -f backend-java/pom.xml -DskipTests package

FROM eclipse-temurin:21-jre

WORKDIR /app
COPY --from=build /workspace/backend-java/target/backend-java-0.0.1-SNAPSHOT.jar app.jar

RUN mkdir -p /app/uploads

ENV PORT=5102
ENV UPLOAD_DIR=/app/uploads

EXPOSE 5102

CMD ["java", "-jar", "app.jar"]
