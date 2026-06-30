require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => {
  client.query('SELECT schema FROM "FormLayout" WHERE "formKey" = \'BOOKING_FORM\'').then(res => {
    console.log(JSON.stringify(res.rows[0].schema.sections.find(s => s.title === 'Focus'), null, 2));
    client.end();
  });
});
