-- Phong trong / phong mau: tao mat bang khong can anh chup.
-- Moi mat bang van gan voi 1 dong room_images (giu nguyen thiet ke cu), dong do co source = 'blank'
-- va khong co file anh that. Anh cu deu la anh chup -> mac dinh 'photo'.
ALTER TABLE room_images
    ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'photo';

ALTER TABLE room_images
    ADD CONSTRAINT chk_room_images_source CHECK (source IN ('photo', 'blank'));
