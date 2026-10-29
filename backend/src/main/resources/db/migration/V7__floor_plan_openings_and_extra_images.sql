-- V7: multi-photo room scan
-- openings: doors/windows lying on the walls, [{type,x1,y1,x2,y2}] in meters
-- extra_image_ids: additional room photos (besides room_image_id) used for the scan

ALTER TABLE floor_plans
    ADD COLUMN openings        JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN extra_image_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
