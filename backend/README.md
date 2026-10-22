# RoomDecor Backend

Spring Boot backend for the RoomDecor application.

## Tech Stack

- **Java 21** + **Spring Boot 3.4**
- **PostgreSQL** + **Flyway** migrations
- **Spring Security** + **JWT** authentication
- **Lombok** for boilerplate reduction

## Getting Started

```powershell
# 1. Start PostgreSQL (team container room-decor-postgres, port 5433, database "roomdecor")
docker start room-decor-postgres

# 2. Create backend/.env from the example, then fill in DB_PASSWORD and JWT_SECRET
cd backend
Copy-Item .env.example .env

# 3. Run with the Maven Wrapper (downloads Maven 3.9.9 on first run; Flyway creates the tables on first start)
.\mvnw.cmd spring-boot:run

# Optional: dev profile (SQL and security debug logs)
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"

# 4. API will be available at http://localhost:8080/api
```

Spring Boot does not read `.env` files by default. `application.yml` imports `backend/.env`
(`spring.config.import: optional:file:.env[.properties]`), so run the commands from the `backend` folder.
Real environment variables (for example in Docker or Jenkins) override values from `.env`.

## API Endpoints

Interactive docs (Swagger UI): http://localhost:8080/swagger-ui.html (click **Authorize** and paste the token from `/api/auth/login`).
Auth API details, error format and roles: [docs/api-auth.md](docs/api-auth.md).

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
| POST | /api/ai/suggest-layout | Get AI layout suggestion | Yes |
| POST | /api/ai/describe-room/{id} | Get AI room description | Yes |
