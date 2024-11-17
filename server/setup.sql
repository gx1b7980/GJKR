CREATE DATABASE projectdemo;
\c projectdemo;
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    balance INT DEFAULT 0
);
INSERT INTO users (name, balance) VALUES 
('alex', 100);

-- Transaction categories
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO categories (name) VALUES
('groceries'),
('entertainment'),
('dining'),
('bills'),
('transportation'),
('personal');

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    FOREIGN KEY (category) REFERENCES categories (name)
);

-- Insert some sample transactions data
INSERT INTO transactions (date, amount, category) VALUES
('2024-11-01 10:00:00', 50.00, 'groceries'),
('2024-11-02 12:30:00', 20.00, 'entertainment'),
('2024-11-03 14:00:00', 30.00, 'dining');
