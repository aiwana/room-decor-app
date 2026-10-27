# RoomDecor Backend

Spring Boot backend for the RoomDecor application.

Catalog CRUD, scene JSON storage and design ownership handoff (Vietnamese):
[docs/api-catalog-design.md](../docs/api-catalog-design.md).

## Tech Stack

- **Java 17** (JDK 17 or newer) + **Spring Boot 3.4**
- **PostgreSQL** + **Flyway** migrations
- **Spring Security** + **JWT** authentication
- **Lombok** for boilerplate reduction

## Getting Started

```powershell
# 1. Create backend/.env from the example, then fill in DB_PASSWORD and JWT_SECRET
cd backend
Copy-Item .env.example .env

# 2. Start PostgreSQL (port 5433, database "roomdecor")
#    New machine: Docker Compose creates the database with the user/password from .env
docker compose up -d
#    Machine that already has the old room-decor-postgres container: use it instead
#    docker start room-decor-postgres

# 3. Run with the Maven Wrapper (downloads Maven 3.9.9 on first run; Flyway creates the tables on first start)
.\mvnw.cmd spring-boot:run

# Optional: dev profile (SQL and security debug logs)
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"

# 4. API will be available at http://localhost:8080/api
```

Spring Boot does not read `.env` files by default. `application.yml` imports `backend/.env`
(`spring.config.import: optional:file:.env[.properties]`), so run the commands from the `backend` folder.
Real environment variables (for example in Docker or Jenkins) override values from `.env`.

## Database (Docker Compose)

`docker-compose.yml` starts PostgreSQL 16 in a container named `roomdecor-db` on `127.0.0.1:5433`.
It reads `DB_USERNAME` and `DB_PASSWORD` from `backend/.env`, so the database and the backend always use the same credentials.
Flyway creates the tables the first time the backend starts. Run these from the `backend` folder:

```powershell
docker compose up -d        # start (first run downloads the image and creates the database)
docker compose ps           # status should be "healthy"
docker compose logs -f      # database logs
docker compose down         # stop, data is kept in the volume roomdecor_pgdata
docker compose down -v      # stop AND delete all data (fresh database next time)
docker compose exec postgres psql -U roomdecor_app -d roomdecor   # SQL console
```

The user and password are only applied when the volume is first created. If you change `DB_PASSWORD` later,
either change it inside the database too, or run `docker compose down -v` to start over with an empty database.
Port 5433 can only be used by one container: if `room-decor-postgres` is running, do not start this one.

## AI Room Scanning

The AI scan feature uses a vision model to analyze a room photo and generate a 2D floor plan.

- **Without API key**: Uses `MockVisionClient` — returns a default 4×4m rectangular room.
- **With OpenAI key**: Set `OPENAI_API_KEY` env var to use GPT-4o Vision for real room analysis.

The vision client is pluggable via the `RoomVisionClient` interface (`service/ai/`). To add a different provider (Gemini, custom CV model), implement this interface.

## API Endpoints

Interactive docs (Swagger UI): http://localhost:8080/swagger-ui.html (click **Authorize** and paste the token from `/api/auth/login`).
All API endpoints: [docs/api.md](../docs/api.md). Auth API details, error format and roles: [docs/api-auth.md](../docs/api-auth.md).
Setup and run guide for the whole project (Vietnamese): [docs/README.md](../docs/README.md).

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/auth/register | Register new user | No |
| POST | /api/auth/login | Login | No |
| GET | /api/users/me | Get current user profile | Yes |
| GET | /api/admin/users | List all users | ADMIN |
| GET | /api/furniture | List furniture (optional category filter) | Yes |
| GET | /api/furniture/{id} | Get furniture by ID | Yes |
| GET | /api/furniture/search?q= | Search furniture by name | Yes |
| GET | /api/designs | List user's designs | Yes |
| GET | /api/designs/{id} | Get design by ID | Yes |
| POST | /api/designs | Create new design | Yes |
| DELETE | /api/designs/{id} | Delete design | Yes |
| POST | /api/room-images/upload | Upload room image | Yes |
| GET | /api/room-images | List user's room images | Yes |
| DELETE | /api/room-images/{id} | Delete room image | Yes |
| POST | /api/ai/scan-room | AI scan room image → 2D floor plan | Yes |
| GET | /api/floor-plans/{id} | Get floor plan by ID | Yes |
| GET | /api/floor-plans/by-room-image/{roomImageId} | Get floor plan for a room image | Yes |
| PUT | /api/floor-plans/{id} | Update floor plan (user corrections) | Yes |
| POST | /api/ai/suggest-layout | Get AI layout suggestion | Yes |
| POST | /api/ai/describe-room/{id} | Get AI room description | Yes |
