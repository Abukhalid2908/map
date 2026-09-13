CREATE TABLE IF NOT EXISTS categories (
 id VARCHAR(40) PRIMARY KEY,
 label VARCHAR(80) NOT NULL UNIQUE,
 icon VARCHAR(40) NOT NULL,
 enabled TINYINT NOT NULL DEFAULT 1,
 revision INT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO categories(id,label,icon) VALUES
('resto_cafe','Resto & Cafe','resto_cafe'),('hotel','Hotel','hotel'),
('food_court','Food Court','food_court'),('atm','ATM','atm'),
('medical','Medis','medical'),('public_facility','Fasilitas Umum','public_facility');
