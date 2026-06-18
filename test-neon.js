require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()').then(res => {
  console.log("SUCCESS:", res.rows);
  process.exit(0);
}).catch(err => {
  console.error("ERROR:", err);
  process.exit(1);
});
