CREATE DATABASE projectdemo;
\c projectdemo;
CREATE TABLE test (
	id SERIAL PRIMARY KEY,
	name VARCHAR(50),
	balance INT,
);
INSERT INTO test (name, balance) VALUES ('alex', 100);
