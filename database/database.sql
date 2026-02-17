-- database.sql
CREATE DATABASE IF NOT EXISTS coffee_shop_db;
USE coffee_shop_db;

-- Users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- In production, use password_hash()
    role ENUM('admin', 'cashier', 'kitchen') NOT NULL
);

-- Products
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(50),
    product_type VARCHAR(20) NOT NULL DEFAULT 'other',
    capacity VARCHAR(80),
    weight_label VARCHAR(80),
    material VARCHAR(255),
    description TEXT,
    image_url TEXT,
    stock_quantity INT NOT NULL DEFAULT 0
);

-- Orders
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100),
    subtotal_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'preparing', 'completed', 'cancelled', 'voided', 'refunded') DEFAULT 'pending',
    payment_method VARCHAR(20) NOT NULL DEFAULT 'cash',
    amount_received DECIMAL(10,2) DEFAULT NULL,
    change_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    receipt_number VARCHAR(40) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Items
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    product_name VARCHAR(100),
    quantity INT,
    price DECIMAL(10, 2),
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Seed Data
INSERT INTO users (username, password, role) VALUES
('admin', 'admin123', 'admin'),
('cashier', 'cashier123', 'cashier'),
('kitchen', 'kitchen123', 'kitchen');

INSERT INTO products (name, price, category, product_type, capacity, weight_label, material, description, image_url, stock_quantity) VALUES
('Espresso', 190.00, 'Coffee', 'coffee', '60ml shot', 'Single serving', '100% arabica espresso', 'A bold espresso shot with rich crema and a clean finish.', 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04', 60),
('Latte', 220.00, 'Coffee', 'coffee', '240ml cup', 'Single serving', 'Espresso + steamed milk', 'A creamy latte with balanced espresso and silky milk texture.', 'https://images.unsplash.com/photo-1461023058943-48dbf1399f98', 45),
('Croissant', 120.00, 'Pastry', 'other', '1 piece', 'Single serving', 'Butter pastry', 'Flaky, buttery pastry baked fresh for café pairing.', 'https://images.unsplash.com/photo-1555507036-ab1f40388085', 30);
