FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /workspace
COPY grader-java/pom.xml grader-java/pom.xml
COPY grader-java/src grader-java/src
RUN mvn -f grader-java/pom.xml -DskipTests package

FROM eclipse-temurin:21-jre

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /workspace/grader-java/target/grader-java-0.0.1-SNAPSHOT.jar app.jar
COPY grader/support-files ./support-files
COPY grader/expected_outputs ./expected_outputs

RUN mkdir -p /app/temp

ENV SUPPORT_FILES_DIR=/app/support-files
ENV EXPECTED_OUTPUTS_DIR=/app/expected_outputs
ENV TEMP_DIR=/app/temp

EXPOSE 5103

CMD ["java", "-jar", "app.jar"]
