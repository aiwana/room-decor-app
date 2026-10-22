-- Flyway V2: user roles (USER, ADMIN)
-- Existing and newly registered users get USER; ADMIN accounts are promoted manually with SQL.

ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER';

ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('USER', 'ADMIN'));
