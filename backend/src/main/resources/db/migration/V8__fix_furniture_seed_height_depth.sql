-- V8: V5 seeded furniture 114..133 with values in the order (width, depth, height)
-- while the columns are (width, height, depth): a wardrobe ended up 60 cm tall and 210 cm deep.
-- Swap height and depth back. V4 rows (101..113) were already correct.
-- Only rows still holding the original V5 numbers are touched, so manual fixes are kept.
UPDATE furniture AS f
SET height = f.depth,
    depth  = f.height
FROM (VALUES
    ('11111111-1111-1111-1111-111111111114'::uuid, 85, 90),   -- Sofa da 2 chỗ
    ('11111111-1111-1111-1111-111111111115'::uuid, 80, 85),   -- Sofa băng 2 chỗ vải
    ('11111111-1111-1111-1111-111111111116'::uuid, 85, 95),   -- Ghế thư giãn gỗ sồi
    ('11111111-1111-1111-1111-111111111117'::uuid, 52, 85),   -- Ghế ăn bọc nệm
    ('11111111-1111-1111-1111-111111111118'::uuid, 40, 75),   -- Ghế bar gỗ
    ('11111111-1111-1111-1111-111111111119'::uuid, 65, 110),  -- Ghế văn phòng lưới
    ('11111111-1111-1111-1111-111111111120'::uuid, 60, 42),   -- Bàn trà gỗ óc chó
    ('11111111-1111-1111-1111-111111111121'::uuid, 80, 75),   -- Bàn ăn 4 người
    ('11111111-1111-1111-1111-111111111122'::uuid, 35, 80),   -- Bàn console mặt đá
    ('11111111-1111-1111-1111-111111111123'::uuid, 40, 55),   -- Bàn đầu giường gỗ sồi
    ('11111111-1111-1111-1111-111111111124'::uuid, 200, 95),  -- Giường đơn 1m2
    ('11111111-1111-1111-1111-111111111125'::uuid, 40, 50),   -- Tủ đầu giường
    ('11111111-1111-1111-1111-111111111126'::uuid, 60, 210),  -- Tủ quần áo 2 cánh
    ('11111111-1111-1111-1111-111111111127'::uuid, 30, 180),  -- Kệ sách 5 tầng
    ('11111111-1111-1111-1111-111111111128'::uuid, 45, 40),   -- Đèn thả trần mây
    ('11111111-1111-1111-1111-111111111129'::uuid, 40, 165),  -- Đèn cây đồng
    ('11111111-1111-1111-1111-111111111130'::uuid, 40, 140),  -- Chậu cây cao
    ('11111111-1111-1111-1111-111111111131'::uuid, 160, 1),   -- Thảm tròn
    ('11111111-1111-1111-1111-111111111132'::uuid, 2, 80),    -- Gương tròn viền đồng
    ('11111111-1111-1111-1111-111111111133'::uuid, 2, 170)    -- Gương toàn thân
) AS seed(id, old_height, old_depth)
WHERE f.id = seed.id
  AND f.height = seed.old_height
  AND f.depth = seed.old_depth;
