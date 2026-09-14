ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS role VARCHAR(16) NOT NULL DEFAULT 'admin' AFTER password_hash;

UPDATE admins SET role = 'admin' WHERE role NOT IN ('admin', 'internal');
