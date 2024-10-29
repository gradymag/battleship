
CREATE DATABASE IF NOT EXISTS battleship;

USE battleship;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS PlayerShips;
DROP TABLE IF EXISTS Ships;
DROP TABLE IF EXISTS Attacks;
DROP TABLE IF EXISTS GameSessions;
DROP TABLE IF EXISTS Players;
SET FOREIGN_KEY_CHECKS = 1;


CREATE TABLE Players (
    player_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE
);


CREATE TABLE Ships (
    ship_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    size INT NOT NULL
);


CREATE TABLE PlayerShips (
    player_ship_id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    ship_id INT NOT NULL,
    position VARCHAR(10) NOT NULL, 
    orientation ENUM('horizontal', 'vertical') NOT NULL,
    FOREIGN KEY (player_id) REFERENCES Players(player_id),
    FOREIGN KEY (ship_id) REFERENCES Ships(ship_id)
);


CREATE TABLE GameSessions (
    game_session_id INT AUTO_INCREMENT PRIMARY KEY,
    player_one_id INT NOT NULL,
    player_two_id INT DEFAULT NULL, 
    session_status ENUM('ongoing', 'ended') DEFAULT 'waiting',
    FOREIGN KEY (player_one_id) REFERENCES Players(player_id),
    FOREIGN KEY (player_two_id) REFERENCES Players(player_id)
);


CREATE TABLE Attacks (
    attack_id INT AUTO_INCREMENT PRIMARY KEY,
    game_session_id INT NOT NULL,
    target_position VARCHAR(10) NOT NULL,
    result ENUM('hit', 'miss') NOT NULL, 
    FOREIGN KEY (game_session_id) REFERENCES GameSessions(game_session_id)
);

SELECT * FROM Players;
SELECT * FROM GameSessions;

