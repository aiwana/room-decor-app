-- Flyway V1: Initial schema

CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE furniture (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    category        VARCHAR(100) NOT NULL,
    width           DOUBLE PRECISION NOT NULL,
    height          DOUBLE PRECISION NOT NULL,
    depth           DOUBLE PRECISION NOT NULL,
    model_url       TEXT,
    thumbnail_url   TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE room_images (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    width       INTEGER NOT NULL,
    height      INTEGER NOT NULL,
    captured_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE designs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    room_image_id   UUID REFERENCES room_images(id) ON DELETE SET NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE furniture_placements (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id     UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
    furniture_id  UUID NOT NULL REFERENCES furniture(id),
    x             DOUBLE PRECISION NOT NULL,
    y             DOUBLE PRECISION NOT NULL,
    rotation       DOUBLE PRECISION DEFAULT 0,
    scale         DOUBLE PRECISION DEFAULT 1.0,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_furniture_category ON furniture(category);
CREATE INDEX idx_designs_user_id ON designs(user_id);
CREATE INDEX idx_room_images_user_id ON room_images(user_id);
CREATE INDEX idx_placements_design_id ON furniture_placements(design_id);

-- 2D floor plans generated from AI room scans
CREATE TABLE floor_plans (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_image_id     UUID NOT NULL UNIQUE REFERENCES room_images(id) ON DELETE CASCADE,
    room_width        DOUBLE PRECISION NOT NULL,
    room_depth        DOUBLE PRECISION NOT NULL,
    ceiling_height    DOUBLE PRECISION NOT NULL,
    walls             JSONB NOT NULL,
    pixels_per_meter  INTEGER NOT NULL,
    description       TEXT,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_floor_plans_room_image_id ON floor_plans(room_image_id);
