-- V4: room materials on designs + sample furniture catalog

ALTER TABLE designs
    ADD COLUMN floor_material VARCHAR(50) NOT NULL DEFAULT 'wood',
    ADD COLUMN wall_material VARCHAR(50) NOT NULL DEFAULT 'white';

-- Fixed IDs keep sample placements stable across machines.
-- model_url uses a Khronos glTF sample asset for demo; replace it before production.
INSERT INTO furniture (id, name, category, width, height, depth, model_url, thumbnail_url) VALUES
    ('11111111-1111-1111-1111-111111111101', 'Sofa văng 3 chỗ', 'sofa', 210, 85, 90, NULL, NULL),
    ('11111111-1111-1111-1111-111111111102', 'Sofa góc chữ L', 'sofa', 260, 85, 160, NULL, NULL),
    ('11111111-1111-1111-1111-111111111103', 'Ghế bành đọc sách', 'chair', 80, 95, 85,
        'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/SheenChair/glTF-Binary/SheenChair.glb', NULL),
    ('11111111-1111-1111-1111-111111111104', 'Ghế ăn gỗ sồi', 'chair', 45, 82, 50,
        'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/SheenChair/glTF-Binary/SheenChair.glb', NULL),
    ('11111111-1111-1111-1111-111111111105', 'Bàn trà mặt kính', 'table', 110, 45, 60, NULL, NULL),
    ('11111111-1111-1111-1111-111111111106', 'Bàn ăn 6 người', 'table', 180, 75, 90, NULL, NULL),
    ('11111111-1111-1111-1111-111111111107', 'Bàn làm việc', 'table', 120, 75, 60, NULL, NULL),
    ('11111111-1111-1111-1111-111111111108', 'Giường đôi 1m6', 'bed', 160, 100, 200, NULL, NULL),
    ('11111111-1111-1111-1111-111111111109', 'Tủ quần áo 3 cánh', 'storage', 150, 210, 60, NULL, NULL),
    ('11111111-1111-1111-1111-111111111110', 'Kệ tivi thấp', 'storage', 180, 50, 40, NULL, NULL),
    ('11111111-1111-1111-1111-111111111111', 'Đèn cây đứng', 'lighting', 40, 160, 40, NULL, NULL),
    ('11111111-1111-1111-1111-111111111112', 'Chậu cây bàng Singapore', 'decor', 45, 150, 45, NULL, NULL),
    ('11111111-1111-1111-1111-111111111113', 'Thảm trải sàn', 'decor', 200, 1, 140, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
