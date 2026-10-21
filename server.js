require("dotenv").config();

const app = require("./src/app");
const pool = require("./src/config/db");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const result = await pool.query("SELECT NOW()");

    console.log("Database connection verified");
    console.log("Database time:", result.rows[0].now);

    if (!process.env.ADMIN_API_KEY || !process.env.CUSTOMER_TOKEN_SECRET) throw new Error('Configure ADMIN_API_KEY and CUSTOMER_TOKEN_SECRET before starting the server.');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to database:");
    console.error(error.message);
    process.exit(1);
  }
}

startServer();

