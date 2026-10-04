const mysql = require("mysql2/promise");

// MYSQL DATABASE POOL CONFIGURATION

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "sainikshetkari_reporting",
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
});

// HELPER QUERY FUNCTION

const query = async (sql, values = []) => {
    return pool.query(sql, values);
};

// TEST DATABASE CONNECTION

const testDatabaseConnection = async () => {
    try {
        const [rows] = await pool.query("SELECT 1 AS database_test");
        console.log("Database Test:", rows[0]);

        // Ensure ownership columns exist for role-based report filtering
        try {
            const {
                ensureReportOwnershipColumns,
            } = require("../utils/ensureReportOwnership");
            await ensureReportOwnershipColumns(pool);
        } catch (schemaErr) {
            console.error(
                "Ownership schema ensure warning:",
                schemaErr.message || schemaErr
            );
        }

        return true;
    } catch (error) {
        console.error("Database test failed:", error.message);
        throw error;
    }
};

const connectDatabase = async () => {
    return pool;
};

// Attach helper functions to pool for compatibility with both object destructuring and direct usage
pool.query = pool.query.bind(pool);
pool.execute = pool.execute.bind(pool);
pool.connectDatabase = connectDatabase;
pool.testDatabaseConnection = testDatabaseConnection;

module.exports = pool;