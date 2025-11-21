-- seed.sql
-- Sample data for E-Commerce Bookstore

-- Ensure pgcrypto is available (for crypt/bcrypt support)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Categories
INSERT INTO categories (name, description) VALUES
('Fiction', 'Fiction books'),
('Science Fiction', 'Sci-Fi and speculative fiction'),
('Mystery', 'Mystery & thriller'),
('Romance', 'Romance novels'),
('Biography', 'Biographies and memoirs'),
('Self-Help', 'Self improvement'),
('Technology', 'Technology & programming'),
('History', 'History and historical studies')
ON CONFLICT (name) DO NOTHING;

-- Admin and test customer (passwords hashed using bcrypt via pgcrypto)
INSERT INTO users (email, password_hash, full_name, is_admin)
VALUES
('admin@bookstore.com', crypt('admin123', gen_salt('bf')), 'Site Admin', true),
('customer@test.com', crypt('customer123', gen_salt('bf')), 'Test Customer', false)
ON CONFLICT (email) DO NOTHING;

-- Sample books
INSERT INTO books (title, author, description, price, stock_quantity, category_id, cover_image_url, isbn, publication_year)
VALUES
('The Great Novel', 'A. Writer', 'A gripping tale of adventure.', 14.99, 12, (SELECT id FROM categories WHERE name='Fiction'), 'https://imgs.search.brave.com/2FSBUJLxu63cahW8dM_-aNSM0_mmkVFJqh11LeqCSdQ/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL0kv/NDFMbTQ1enJ3WUwu/anBn', '9780000000001', 2019),
('Deep Space', 'S. Astronaut', 'Space opera and exploration.', 18.50, 7, (SELECT id FROM categories WHERE name='Science Fiction'), 'https://imgs.search.brave.com/z8c5SJyOG4YKz1MhCqPYc4c4NxLannhOQG0qpIZoVL8/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL0kv/NTF6RkdxaUJaNEwu/anBn', '9780000000002', 2021),
('Murder Mystery', 'C. Sleuth', 'A classic whodunit.', 12.00, 5, (SELECT id FROM categories WHERE name='Mystery'), 'https://imgs.search.brave.com/xL_RgS6IJQUnOA_X-vhla3u1AURn7vRL2SEzH2eqHbA/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWFn/ZXMtcGxhdGZvcm0u/OTlzdGF0aWMuY29t/Ly9QXzA5NVd5dXpZ/RExLRzQ2eDBuRzdY/YTk1dFk9LzExMDN4/MDozODAweDI2OTcv/Zml0LWluLzUwMHg1/MDAvcHJvamVjdHMt/ZmlsZXMvODEvODEz/MS84MTMxNDIvYjY3/MWUyMjUtYmUwYy00/YzY5LThhODEtYjhh/ZTExMDg5ZDEzLmpw/Zw', '9780000000003', 2015),
('Love Story', 'R. Heart', 'A modern romance novel.', 9.99, 20, (SELECT id FROM categories WHERE name='Romance'), 'https://imgs.search.brave.com/wCC8ehrSmka-I86V5gQuyB_AEQkjLmIEaPjkrH4iC_A/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL0kv/MzFlYWZxT3ZnQUwu/anBn', '9780000000004', 2020),
('Learn Go', 'G. Coder', 'A practical guide to Go programming.', 29.99, 15, (SELECT id FROM categories WHERE name='Technology'), 'https://imgs.search.brave.com/6mQE2C8kaezFjQaeahC26D9g4yyNwgM9bC0GiIGn-1g/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9nby5k/ZXYvaW1hZ2VzL2xl/YXJuL2ludHJvZHVj/aW5nLWdvLWJvb2su/cG5n', '9780000000005', 2022),
('History of Everything', 'H. Scholar', 'Comprehensive historical overview.', 24.00, 8, (SELECT id FROM categories WHERE name='History'), 'https://imgs.search.brave.com/Z3HZ1_SamKg07qOHU22elqcbV9f4fk8t7jW6_heoHTM/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9pbWFn/ZXMuYmxpbmtpc3Qu/aW8vaW1hZ2VzL2Jv/b2tzLzU0MDVlZTc1/NjYzMjY1MDAwODQ1/MDAwMC8xXzEvNDcw/LmpwZw', '9780000000006', 2018)
ON CONFLICT (isbn) DO NOTHING;

-- Optional: sample address for test customer
INSERT INTO addresses (user_id, full_name, phone, address_line1, city, state, postal_code, country, is_default)
VALUES ((SELECT id FROM users WHERE email='customer@test.com'), 'Test Customer', '555-0100', '123 Test St', 'Testville', 'TS', '12345', 'Testland', true)
ON CONFLICT DO NOTHING;
