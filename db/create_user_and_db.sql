-- Create database and user for the project
-- Run as a superuser (psql -U postgres)
CREATE DATABASE proiectdb;
CREATE USER proiectuser WITH ENCRYPTED PASSWORD 'proiectpass';
GRANT ALL PRIVILEGES ON DATABASE proiectdb TO proiectuser;
