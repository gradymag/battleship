
DROP DATABASE IF EXISTS battleship;
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
    UNIQUE KEY unique_player_ship (player_id, ship_id)
);





CREATE TABLE GameSessions (
    game_session_id INT AUTO_INCREMENT PRIMARY KEY,
    player_one_id INT NOT NULL,
    player_two_id INT DEFAULT NULL, 
    session_status ENUM('waiting', 'ended') DEFAULT 'waiting',
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

SHOW TABLES;

SELECT * FROM Players;
SELECT * FROM GameSessions;
SELECT * FROM Ships;
SELECT * FROM PlayerShips;
SELECT * FROM attacks;

INSERT INTO Ships (name, size) VALUES
('Carrier', 4),
('Battleship', 5),
('Cruiser', 3),
('Submarine', 3),
('Patrol', 2);

#INSERT INTO Players (player_id, username) VALUES (1, 'Player1'), (2, 'Player2');



#INSERT INTO PlayerShips (player_id, ship_id, position, orientation) VALUES
#(2, 1, 'B2', 'horizontal'), 
#(2, 2, 'E4', 'vertical'),
#(2, 3, 'C7', 'horizontal'),
#(2, 4, 'H1', 'vertical'),
#(2, 5, 'I8', 'horizontal'); 

#INSERT INTO PlayerShips (player_id, ship_id, position, orientation) VALUES
#(4, 1, 'B2', 'horizontal'), 
#(4, 2, 'E4', 'vertical'),
#(4, 3, 'C7', 'horizontal'),
#(4, 4, 'H1', 'vertical'),
#(4, 5, 'I8', 'horizontal'); 

