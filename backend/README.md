# RoomDecor Backend

Spring Boot backend for the RoomDecor application.

## Tech Stack

- **Java 21** + **Spring Boot 3.4**
- **PostgreSQL** + **Flyway** migrations
- **Spring Security** + **JWT** authentication
- **Lombok** for boilerplate reduction

## Getting Started

```bash
# 1. Start PostgreSQL (requires database named "roomdecor")
# 2. Copy env file and update values
cp .env.example .env

# 3. Run with Maven wrapper (no Maven install needed)
.\mvnw spring-boot:run

# 4. API will be available at http://localhost:8080/api
```

## AI Room Scanning

The AI scan feature uses a vision model to analyze a room photo and generate a 2D floor plan.

- **Without API key**: Uses `MockVisionClient` — returns a default 4×4m rectangular room.
- **With OpenAI key**: Set `OPENAI_API_KEY` env var to use GPT-4o Vision for real room analysis.

The vision client is pluggable via the `RoomVisionClient` interface (`service/ai/`). To add a different provider (Gemini, custom CV model), implement this interface.

## API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/auth/register | Register new user | No |
| POST | /api/auth/login | Login | No |
| GET | /api/users/me | Get current user profile | Yes |
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
