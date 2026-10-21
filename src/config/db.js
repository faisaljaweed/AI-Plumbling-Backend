const { Pool, types } = require("pg");
// Calendar dates and naive scheduled timestamps must never shift with the host timezone.
types.setTypeParser(1082, value => value);
types.setTypeParser(1114, value => new Date(value.replace(' ', 'T') + 'Z'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: '-c timezone=UTC',
  connectionTimeoutMillis: 10000,
});

pool.on("connect", () => {
  console.log("PostgreSQL connected successfully");
});

pool.on("error", (err) => {
  console.error("PostgreSQL connection error:", err.message);
});

module.exports = pool;


