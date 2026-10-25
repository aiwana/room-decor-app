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
