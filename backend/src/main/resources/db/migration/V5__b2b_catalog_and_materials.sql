-- V5: B2B2C catalog (vendors, prices) and room materials with reference prices.
-- Prices are reference values for the demo, not a live quote.
-- Furniture thumbnails are AI-generated demo images; replace with shop photos before production.

CREATE TABLE vendors (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    phone       VARCHAR(50),
    address     TEXT,
    logo_url    TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO vendors (id, name, phone, address) VALUES
    ('22222222-2222-2222-2222-222222222201', 'Nội thất Mộc Việt', '0900 000 001', '128 Nguyễn Trãi, Q.1, TP.HCM'),
    ('22222222-2222-2222-2222-222222222202', 'Nhà Xinh Decor', '0900 000 002', '45 Phan Xích Long, Phú Nhuận, TP.HCM'),
    ('22222222-2222-2222-2222-222222222203', 'Gạch & Sàn An Phú', '0900 000 003', '12 Nguyễn Văn Linh, Q.7, TP.HCM'),
    ('22222222-2222-2222-2222-222222222204', 'Sơn Mộc Home', '0900 000 004', '88 Lê Văn Việt, TP. Thủ Đức')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE furniture
    ADD COLUMN vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    ADD COLUMN price NUMERIC(14,2),
    ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'VND',
    ADD COLUMN style VARCHAR(50),
    ADD COLUMN material VARCHAR(100),
    ADD COLUMN stock_status VARCHAR(30) NOT NULL DEFAULT 'in_stock';

UPDATE furniture SET
    currency = 'VND',
    stock_status = 'in_stock',
    style = CASE id::text
        WHEN '11111111-1111-1111-1111-111111111103' THEN 'Retro'
        WHEN '11111111-1111-1111-1111-111111111104' THEN 'Scandinavian'
        WHEN '11111111-1111-1111-1111-111111111113' THEN 'Hiện đại'
        ELSE 'Hiện đại'
    END,
    vendor_id = CASE id::text
        WHEN '11111111-1111-1111-1111-111111111103' THEN '22222222-2222-2222-2222-222222222202'::uuid
        WHEN '11111111-1111-1111-1111-111111111104' THEN '22222222-2222-2222-2222-222222222202'::uuid
        WHEN '11111111-1111-1111-1111-111111111107' THEN '22222222-2222-2222-2222-222222222202'::uuid
        WHEN '11111111-1111-1111-1111-111111111111' THEN '22222222-2222-2222-2222-222222222202'::uuid
        WHEN '11111111-1111-1111-1111-111111111112' THEN '22222222-2222-2222-2222-222222222202'::uuid
        WHEN '11111111-1111-1111-1111-111111111113' THEN '22222222-2222-2222-2222-222222222202'::uuid
        ELSE '22222222-2222-2222-2222-222222222201'::uuid
    END,
    material = CASE id::text
        WHEN '11111111-1111-1111-1111-111111111101' THEN 'Vải'
        WHEN '11111111-1111-1111-1111-111111111102' THEN 'Vải'
        WHEN '11111111-1111-1111-1111-111111111103' THEN 'Gỗ sồi'
        WHEN '11111111-1111-1111-1111-111111111104' THEN 'Gỗ sồi'
        WHEN '11111111-1111-1111-1111-111111111105' THEN 'Kính cường lực'
        WHEN '11111111-1111-1111-1111-111111111106' THEN 'Gỗ công nghiệp'
        WHEN '11111111-1111-1111-1111-111111111107' THEN 'Gỗ công nghiệp'
        WHEN '11111111-1111-1111-1111-111111111108' THEN 'Gỗ công nghiệp'
        WHEN '11111111-1111-1111-1111-111111111109' THEN 'Gỗ công nghiệp'
        WHEN '11111111-1111-1111-1111-111111111110' THEN 'Gỗ công nghiệp'
        WHEN '11111111-1111-1111-1111-111111111111' THEN 'Kim loại'
        WHEN '11111111-1111-1111-1111-111111111112' THEN 'Cây tự nhiên'
        WHEN '11111111-1111-1111-1111-111111111113' THEN 'Vải'
        ELSE NULL
    END,
    thumbnail_url = CASE id::text
        WHEN '11111111-1111-1111-1111-111111111101' THEN '/furniture/sofa-beige.jpg'
        WHEN '11111111-1111-1111-1111-111111111102' THEN '/furniture/sofa-l-gray.jpg'
        WHEN '11111111-1111-1111-1111-111111111103' THEN '/furniture/armchair-green.jpg'
        WHEN '11111111-1111-1111-1111-111111111104' THEN '/furniture/dining-chair-oak.jpg'
        WHEN '11111111-1111-1111-1111-111111111105' THEN '/furniture/coffee-table-glass.jpg'
        WHEN '11111111-1111-1111-1111-111111111106' THEN '/furniture/dining-table-wood.jpg'
        WHEN '11111111-1111-1111-1111-111111111107' THEN '/furniture/desk-white-oak.jpg'
        WHEN '11111111-1111-1111-1111-111111111108' THEN '/furniture/bed-upholstered.jpg'
        WHEN '11111111-1111-1111-1111-111111111109' THEN '/furniture/wardrobe-white.jpg'
        WHEN '11111111-1111-1111-1111-111111111110' THEN '/furniture/tv-console-walnut.jpg'
        WHEN '11111111-1111-1111-1111-111111111111' THEN '/furniture/floor-lamp-black.jpg'
        WHEN '11111111-1111-1111-1111-111111111112' THEN '/furniture/plant-monstera.jpg'
        WHEN '11111111-1111-1111-1111-111111111113' THEN '/furniture/rug-pattern.jpg'
        ELSE NULL
    END,
    price = CASE id::text
        WHEN '11111111-1111-1111-1111-111111111101' THEN 12900000
        WHEN '11111111-1111-1111-1111-111111111102' THEN 18500000
        WHEN '11111111-1111-1111-1111-111111111103' THEN 4200000
        WHEN '11111111-1111-1111-1111-111111111104' THEN 1250000
        WHEN '11111111-1111-1111-1111-111111111105' THEN 3800000
        WHEN '11111111-1111-1111-1111-111111111106' THEN 8900000
        WHEN '11111111-1111-1111-1111-111111111107' THEN 4500000
        WHEN '11111111-1111-1111-1111-111111111108' THEN 11900000
        WHEN '11111111-1111-1111-1111-111111111109' THEN 9800000
        WHEN '11111111-1111-1111-1111-111111111110' THEN 5200000
        WHEN '11111111-1111-1111-1111-111111111111' THEN 1450000
        WHEN '11111111-1111-1111-1111-111111111112' THEN 890000
        WHEN '11111111-1111-1111-1111-111111111113' THEN 2300000
        ELSE NULL
    END
WHERE id::text IN (
    '11111111-1111-1111-1111-111111111101', '11111111-1111-1111-1111-111111111102',
    '11111111-1111-1111-1111-111111111103', '11111111-1111-1111-1111-111111111104',
    '11111111-1111-1111-1111-111111111105', '11111111-1111-1111-1111-111111111106',
    '11111111-1111-1111-1111-111111111107', '11111111-1111-1111-1111-111111111108',
    '11111111-1111-1111-1111-111111111109', '11111111-1111-1111-1111-111111111110',
    '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111112',
    '11111111-1111-1111-1111-111111111113'
);

INSERT INTO furniture (
    id, name, category, width, height, depth, model_url, thumbnail_url,
    vendor_id, price, currency, style, material, stock_status
) VALUES
    ('11111111-1111-1111-1111-111111111114', 'Sofa da 2 chỗ', 'sofa', 170, 85, 90, NULL, '/furniture/sofa-leather-brown.jpg',
     '22222222-2222-2222-2222-222222222201', 9900000, 'VND', 'Hiện đại', 'Da bò', 'in_stock'),
    ('11111111-1111-1111-1111-111111111115', 'Sofa băng 2 chỗ vải', 'sofa', 165, 80, 85, NULL, '/furniture/sofa-beige.jpg',
     '22222222-2222-2222-2222-222222222202', 8900000, 'VND', 'Hiện đại', 'Vải', 'in_stock'),
    ('11111111-1111-1111-1111-111111111116', 'Ghế thư giãn gỗ sồi', 'chair', 80, 85, 95, NULL, '/furniture/armchair-green.jpg',
     '22222222-2222-2222-2222-222222222201', 3600000, 'VND', 'Retro', 'Gỗ sồi', 'in_stock'),
    ('11111111-1111-1111-1111-111111111117', 'Ghế ăn bọc nệm', 'chair', 45, 52, 85, NULL, '/furniture/dining-chair-oak.jpg',
     '22222222-2222-2222-2222-222222222201', 1450000, 'VND', 'Scandinavian', 'Gỗ sồi', 'in_stock'),
    ('11111111-1111-1111-1111-111111111118', 'Ghế bar gỗ', 'chair', 40, 40, 75, NULL, '/furniture/bar-stool.jpg',
     '22222222-2222-2222-2222-222222222202', 1900000, 'VND', 'Industrial', 'Kim loại', 'in_stock'),
    ('11111111-1111-1111-1111-111111111119', 'Ghế văn phòng lưới', 'chair', 65, 65, 110, NULL, '/furniture/office-chair-black.jpg',
     '22222222-2222-2222-2222-222222222201', 3200000, 'VND', 'Hiện đại', 'Lưới', 'in_stock'),
    ('11111111-1111-1111-1111-111111111120', 'Bàn trà gỗ óc chó', 'table', 120, 60, 42, NULL, '/furniture/coffee-table-glass.jpg',
     '22222222-2222-2222-2222-222222222202', 4600000, 'VND', 'Hiện đại', 'Gỗ óc chó', 'in_stock'),
    ('11111111-1111-1111-1111-111111111121', 'Bàn ăn 4 người', 'table', 140, 80, 75, NULL, '/furniture/dining-table-wood.jpg',
     '22222222-2222-2222-2222-222222222202', 6900000, 'VND', 'Scandinavian', 'Gỗ sồi', 'in_stock'),
    ('11111111-1111-1111-1111-111111111122', 'Bàn console mặt đá', 'table', 120, 35, 80, NULL, '/furniture/console-marble.jpg',
     '22222222-2222-2222-2222-222222222201', 4800000, 'VND', 'Hiện đại', 'Đá marble', 'in_stock'),
    ('11111111-1111-1111-1111-111111111123', 'Bàn đầu giường gỗ sồi', 'table', 45, 40, 55, NULL, '/furniture/nightstand-oak.jpg',
     '22222222-2222-2222-2222-222222222202', 1800000, 'VND', 'Minimal', 'Gỗ sồi', 'in_stock'),
    ('11111111-1111-1111-1111-111111111124', 'Giường đơn 1m2', 'bed', 120, 200, 95, NULL, '/furniture/bed-upholstered.jpg',
     '22222222-2222-2222-2222-222222222202', 7900000, 'VND', 'Hiện đại', 'Vải', 'in_stock'),
    ('11111111-1111-1111-1111-111111111125', 'Tủ đầu giường', 'storage', 45, 40, 50, NULL, '/furniture/nightstand-oak.jpg',
     '22222222-2222-2222-2222-222222222201', 1600000, 'VND', 'Minimal', 'Gỗ sồi', 'in_stock'),
    ('11111111-1111-1111-1111-111111111126', 'Tủ quần áo 2 cánh', 'storage', 100, 60, 210, NULL, '/furniture/wardrobe-white.jpg',
     '22222222-2222-2222-2222-222222222202', 7500000, 'VND', 'Hiện đại', 'MDF', 'in_stock'),
    ('11111111-1111-1111-1111-111111111127', 'Kệ sách 5 tầng', 'storage', 80, 30, 180, NULL, '/furniture/tv-console-walnut.jpg',
     '22222222-2222-2222-2222-222222222201', 3900000, 'VND', 'Hiện đại', 'Gỗ óc chó', 'in_stock'),
    ('11111111-1111-1111-1111-111111111128', 'Đèn thả trần mây', 'lighting', 45, 45, 40, NULL, '/furniture/pendant-rattan.jpg',
     '22222222-2222-2222-2222-222222222202', 1350000, 'VND', 'Bohemian', 'Mây tre', 'in_stock'),
    ('11111111-1111-1111-1111-111111111129', 'Đèn cây đồng', 'lighting', 40, 40, 165, NULL, '/furniture/floor-lamp-black.jpg',
     '22222222-2222-2222-2222-222222222201', 2100000, 'VND', 'Hiện đại', 'Kim loại', 'in_stock'),
    ('11111111-1111-1111-1111-111111111130', 'Chậu cây cao', 'decor', 40, 40, 140, NULL, '/furniture/plant-monstera.jpg',
     '22222222-2222-2222-2222-222222222201', 1200000, 'VND', 'Green', 'Cây tự nhiên', 'in_stock'),
    ('11111111-1111-1111-1111-111111111131', 'Thảm tròn', 'decor', 160, 160, 1, NULL, '/furniture/rug-pattern.jpg',
     '22222222-2222-2222-2222-222222222202', 1500000, 'VND', 'Hiện đại', 'Len', 'in_stock'),
    ('11111111-1111-1111-1111-111111111132', 'Gương tròn viền đồng', 'decor', 80, 2, 80, NULL, '/furniture/mirror-round.jpg',
     '22222222-2222-2222-2222-222222222202', 2400000, 'VND', 'Hiện đại', 'Kính', 'in_stock'),
    ('11111111-1111-1111-1111-111111111133', 'Gương toàn thân', 'decor', 50, 2, 170, NULL, '/furniture/mirror-round.jpg',
     '22222222-2222-2222-2222-222222222201', 3100000, 'VND', 'Hiện đại', 'Kính', 'in_stock')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE materials (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id           UUID REFERENCES vendors(id) ON DELETE SET NULL,
    code                VARCHAR(50) NOT NULL UNIQUE,
    name                VARCHAR(200) NOT NULL,
    kind                VARCHAR(20) NOT NULL,
    style               VARCHAR(50),
    color_hex           VARCHAR(9),
    tile_width_cm       NUMERIC(6,1),
    tile_height_cm      NUMERIC(6,1),
    price               NUMERIC(14,2),
    price_unit          VARCHAR(20) NOT NULL DEFAULT 'm2',
    coverage_m2_per_box NUMERIC(6,2),
    texture_url         TEXT,
    texture_license     VARCHAR(50),
    source_url          TEXT,
    is_sample           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_materials_kind ON materials(kind);

INSERT INTO materials (
    vendor_id, code, name, kind, style, color_hex, tile_width_cm, tile_height_cm,
    price, price_unit, coverage_m2_per_box, texture_url, texture_license, source_url, is_sample
) VALUES
    ('22222222-2222-2222-2222-222222222203', 'wood', 'Sàn gỗ công nghiệp 12mm', 'floor', 'Hiện đại', '#8B5A2B', 19.0, 120.0,
     350000, 'm2', 2.16, '/materials/brown_planks_03.jpg', 'CC0',
     'https://polyhaven.com/a/brown_planks_03', TRUE),
    ('22222222-2222-2222-2222-222222222203', 'tile-white', 'Gạch bóng 60×60 trắng', 'floor', 'Hiện đại', '#E8E6E1', 60.0, 60.0,
     230000, 'm2', 1.44, '/materials/interior_tiles.jpg', 'CC0',
     'https://gachluxcasa.vn/gia-gach-lat-nen/', TRUE),
    ('22222222-2222-2222-2222-222222222203', 'tile-gray', 'Gạch mờ 60×60 xám', 'floor', 'Hiện đại', '#9AA0A6', 60.0, 60.0,
     250000, 'm2', 1.44, '/materials/grey_cartago_01.jpg', 'CC0',
     'https://gachluxcasa.vn/gia-gach-lat-nen/', TRUE),
    ('22222222-2222-2222-2222-222222222203', 'terrazzo', 'Gạch terrazzo 40×40', 'floor', 'Retro', '#D9D2C5', 40.0, 40.0,
     270000, 'm2', 1.44, '/materials/terrazzo_tiles.jpg', 'CC0',
     'https://gachluxcasa.vn/gia-gach-lat-nen/', TRUE),
    ('22222222-2222-2222-2222-222222222203', 'tile-wood', 'Gạch giả gỗ 15×90', 'floor', 'Hiện đại', '#9B6A3A', 15.0, 90.0,
     280000, 'm2', 1.35, '/materials/brown_floor_tiles.jpg', 'CC0',
     'https://gachluxcasa.vn/gia-gach-lat-nen/', TRUE),
    ('22222222-2222-2222-2222-222222222203', 'tile-80', 'Gạch 80×80 kem', 'floor', 'Hiện đại', '#E6DCC8', 80.0, 80.0,
     390000, 'm2', 1.28, '/materials/interior_tiles.jpg', 'CC0',
     'https://viglacerahanoi.vn/bang-gia-gach-lat-nen.html', TRUE),
    ('22222222-2222-2222-2222-222222222203', 'tile-marble', 'Gạch marble 60×60', 'floor', 'Sang trọng', '#E9E7E2', 60.0, 60.0,
     320000, 'm2', 1.44, '/materials/marble_01.jpg', 'CC0',
     'https://gachluxcasa.vn/gia-gach-lat-nen/', TRUE),
    ('22222222-2222-2222-2222-222222222203', 'tile-terracotta', 'Gạch terracotta 30×30', 'floor', 'Mộc mạc', '#B66A4A', 30.0, 30.0,
     210000, 'm2', 1.0, '/materials/terracotta_floor_tiles.jpg', 'CC0',
     'https://gachluxcasa.vn/gia-gach-lat-nen/', TRUE),
    ('22222222-2222-2222-2222-222222222204', 'white', 'Sơn nội thất trắng', 'wall', 'Hiện đại', '#ECE9E3', NULL, NULL,
     45000, 'm2', NULL, NULL, NULL,
     'https://songiaphat.com/bang-bao-gia-son-maxilite-moi-nhat-dong-son-gia-re-tot-nhat/', TRUE),
    ('22222222-2222-2222-2222-222222222204', 'cream', 'Sơn nội thất kem', 'wall', 'Ấm áp', '#E7D8B8', NULL, NULL,
     45000, 'm2', NULL, NULL, NULL,
     'https://songiaphat.com/bang-bao-gia-son-maxilite-moi-nhat-dong-son-gia-re-tot-nhat/', TRUE),
    ('22222222-2222-2222-2222-222222222204', 'sage', 'Sơn nội thất xanh sage', 'wall', 'Thiên nhiên', '#A8B5A2', NULL, NULL,
     45000, 'm2', NULL, NULL, NULL,
     'https://songiaphat.com/bang-bao-gia-son-maxilite-moi-nhat-dong-son-gia-re-tot-nhat/', TRUE),
    ('22222222-2222-2222-2222-222222222204', 'blue', 'Sơn nội thất xanh nhạt', 'wall', 'Nhẹ nhàng', '#AFC4D6', NULL, NULL,
     45000, 'm2', NULL, NULL, NULL,
     'https://songiaphat.com/bang-bao-gia-son-maxilite-moi-nhat-dong-son-gia-re-tot-nhat/', TRUE),
    ('22222222-2222-2222-2222-222222222203', 'tile-wall', 'Gạch ốp tường 30×60 trắng', 'wall', 'Hiện đại', '#EDEDED', 30.0, 60.0,
     220000, 'm2', 1.44, '/materials/granite_tile_03.jpg', 'CC0',
     'https://khatra.com.vn/gach-op-tuong/30x60/', TRUE),
    ('22222222-2222-2222-2222-222222222203', 'tile-wall-gray', 'Gạch ốp tường 30×60 xám', 'wall', 'Hiện đại', '#B7B9B8', 30.0, 60.0,
     220000, 'm2', 1.44, '/materials/grey_cartago_01.jpg', 'CC0',
     'https://khatra.com.vn/gach-op-tuong/30x60/', TRUE),
    ('22222222-2222-2222-2222-222222222204', 'wall-decor', 'Tường hiệu ứng plaster', 'wall', 'Nghệ thuật', '#D7CFC3', NULL, NULL,
     180000, 'm2', NULL, '/materials/patterned_plaster_wall.jpg', 'CC0',
     'https://polyhaven.com/a/patterned_plaster_wall', TRUE),
    ('22222222-2222-2222-2222-222222222203', 'skirting-10x60', 'Gạch viền chân tường 10×60', 'skirting', 'Hiện đại', '#D8D4CB', 10.0, 60.0,
     70000, 'md', NULL, '/materials/interior_tiles.jpg', 'CC0',
     'https://gachoplatbachma.com/gach-vien-chan-tuong-12x60.html', TRUE),
    ('22222222-2222-2222-2222-222222222203', 'skirting-12x60', 'Gạch viền chân tường 12×60', 'skirting', 'Hiện đại', '#D8D4CB', 12.0, 60.0,
     75000, 'md', NULL, '/materials/interior_tiles.jpg', 'CC0',
     'https://gachoplatbachma.com/gach-vien-chan-tuong-12x60.html', TRUE),
    ('22222222-2222-2222-2222-222222222203', 'skirting-12x40', 'Gạch viền chân tường 12×40', 'skirting', 'Hiện đại', '#D8D4CB', 12.0, 40.0,
     100000, 'md', NULL, '/materials/interior_tiles.jpg', 'CC0',
     'https://gachoplatbachma.com/gach-vien-chan-tuong-12x60.html', TRUE)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE designs
    ADD COLUMN skirting_material VARCHAR(50) NOT NULL DEFAULT 'skirting-10x60';
