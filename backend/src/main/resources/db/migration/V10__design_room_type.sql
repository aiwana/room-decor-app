-- Loai phong cua thiet ke (de loc / nhom trong man "Của tôi").
-- Thiet ke cu chua co loai -> 'other'. Chi them cot, khong doi du lieu cu.
ALTER TABLE designs
    ADD COLUMN room_type VARCHAR(30) NOT NULL DEFAULT 'other';

ALTER TABLE designs
    ADD CONSTRAINT chk_designs_room_type
    CHECK (room_type IN ('living', 'bedroom', 'kitchen', 'dining', 'office', 'kids', 'bathroom', 'other'));
