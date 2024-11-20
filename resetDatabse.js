const mysql = require('mysql2');


const connection = mysql.createConnection({
    host: 'gx97kbnhgjzh3efb.cbetxkdyhwsb.us-east-1.rds.amazonaws.com',
    user: 'ggi9lwdzlbqdgb04',
    password: 'k6u5n58y3mvvft7u',
    database: 'eabh9evmkhtwf4bq',
});

const resetDatabase = async () => {
    try {
        console.log('Resetting database...');

        
        await connection.promise().query('SET FOREIGN_KEY_CHECKS = 0;');
        console.log('Dropping tables...');
        await connection.promise().query('DROP TABLE IF EXISTS Attacks;');
        await connection.promise().query('DROP TABLE IF EXISTS PlayerShips;');
        await connection.promise().query('DROP TABLE IF EXISTS Ships;');
        await connection.promise().query('DROP TABLE IF EXISTS GameSessions;');
        await connection.promise().query('DROP TABLE IF EXISTS Players;');
        console.log('Tables dropped successfully.');

       
        await connection.promise().query('SET FOREIGN_KEY_CHECKS = 1;');

        
        console.log('Recreating tables...');
        await connection.promise().query(`
            CREATE TABLE Players (
                player_id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE
            );
        `);

        await connection.promise().query(`
            CREATE TABLE Ships (
                ship_id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                size INT NOT NULL
            );
        `);

        await connection.promise().query(`
            CREATE TABLE PlayerShips (
                player_ship_id INT AUTO_INCREMENT PRIMARY KEY,
                player_id INT NOT NULL,
                ship_id INT NOT NULL,
                position VARCHAR(10) NOT NULL,
                orientation ENUM('horizontal', 'vertical') NOT NULL,
                UNIQUE KEY unique_player_ship (player_id, ship_id)
            );
        `);

        await connection.promise().query(`
            CREATE TABLE GameSessions (
                game_session_id INT AUTO_INCREMENT PRIMARY KEY,
                player_one_id INT NOT NULL,
                player_two_id INT DEFAULT NULL,
                session_status ENUM('waiting', 'ended') DEFAULT 'waiting',
                FOREIGN KEY (player_one_id) REFERENCES Players(player_id),
                FOREIGN KEY (player_two_id) REFERENCES Players(player_id)
            );
        `);

        await connection.promise().query(`
            CREATE TABLE Attacks (
                attack_id INT AUTO_INCREMENT PRIMARY KEY,
                game_session_id INT NOT NULL,
                target_position VARCHAR(10) NOT NULL,
                result ENUM('hit', 'miss') NOT NULL,
                FOREIGN KEY (game_session_id) REFERENCES GameSessions(game_session_id)
            );
        `);
        console.log('Tables recreated successfully.');

       
        console.log('Inserting dummy data...');
        await connection.promise().query(`
            INSERT INTO Ships (name, size) VALUES
            ('Carrier', 4),
            ('Battleship', 5),
            ('Cruiser', 3),
            ('Submarine', 3),
            ('Patrol', 2);
        `);

        await connection.promise().query(`
            INSERT INTO PlayerShips (player_id, ship_id, position, orientation) VALUES
            (2, 1, 'B2', 'horizontal'), 
            (2, 2, 'E4', 'vertical'),
            (2, 3, 'C7', 'horizontal'),
            (2, 4, 'H1', 'vertical'),
            (2, 5, 'I8', 'horizontal'); 
        `);

        console.log('Database reset and dummy data inserted successfully!');
    } catch (error) {
        console.error('Error resetting database:', error);
    } finally {
        connection.end();
    }
};

resetDatabase();
