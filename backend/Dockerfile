# RoomDecor backend (Spring Boot 3.4, Java 17)
# Build:  docker build -t roomdecor-backend:local .        (run in the backend folder)
# Run:    see docker-compose.yml / docs/06-docker.md
# Secrets (DB_PASSWORD, JWT_SECRET, GEMINI_API_KEY...) are passed as environment variables at run time,
# never copied into the image (.env is in .dockerignore).

# ---- Stage 1: build the jar with Maven ----
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /src
# Download dependencies first so they are cached while only the source code changes
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
# Tests run in Jenkins before this step; skip them here to keep the image build fast
RUN mvn -B -q -DskipTests package \
 && cp target/roomdecor-backend-*.jar /src/app.jar

# ---- Stage 2: small runtime image (JRE only, no Maven, no source) ----
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
# Run as a normal user, not root
RUN addgroup -S app && adduser -S app -G app \
 && mkdir -p /app/uploads && chown app:app /app/uploads
COPY --from=build --chown=app:app /src/app.jar /app/app.jar
USER app

# Uploaded room photos live here; mount a volume or host folder on it to keep them
ENV UPLOAD_DIR=/app/uploads
VOLUME ["/app/uploads"]
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/actuator/health | grep -q '"UP"' || exit 1

# exec form: java is PID 1 and receives SIGTERM from "docker stop" (graceful shutdown)
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
