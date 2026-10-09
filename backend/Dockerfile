FROM eclipse-temurin:21-jdk-jammy AS builder
WORKDIR /workspace

COPY . .
RUN chmod +x ./gradlew \
    && ./gradlew bootJar -x jooqCodegen --no-daemon

FROM eclipse-temurin:21-jre-jammy AS runtime
WORKDIR /app

ENV JAVA_TOOL_OPTIONS="-Xmx384m"
ENV SERVER_PORT=8081

RUN useradd --system --uid 10001 --create-home appuser
COPY --from=builder --chown=appuser:appuser /workspace/build/libs/*.jar /app/app.jar

USER appuser
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "/app/app.jar"]