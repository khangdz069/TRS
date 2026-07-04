FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /workspace
COPY grader/pom.xml grader/pom.xml
COPY grader/src grader/src
RUN mvn -f grader/pom.xml -DskipTests package

FROM eclipse-temurin:21-jre

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /workspace/grader/target/grader-0.0.1-SNAPSHOT.jar app.jar
COPY grader/assets/support-files ./support-files
COPY grader/assets/expected_outputs ./expected_outputs

RUN mkdir -p /app/temp

ENV SUPPORT_FILES_DIR=/app/support-files
ENV EXPECTED_OUTPUTS_DIR=/app/expected_outputs
ENV TEMP_DIR=/app/temp

EXPOSE 5103

CMD ["java", "-jar", "app.jar"]
