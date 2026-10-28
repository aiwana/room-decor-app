-- V6: align material names with their texture colors.

UPDATE materials
SET name = 'Gạch bóng 60×60 sáng'
WHERE code = 'tile-white';

UPDATE materials
SET name = 'Gạch ốp tường 30×60 sáng',
    texture_url = '/materials/interior_tiles.jpg'
WHERE code = 'tile-wall';
