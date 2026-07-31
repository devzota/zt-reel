const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: 'postgresql://root:rootpassword@localhost:5432/ztreel?schema=public' });
  await client.connect();
  const res = await client.query("SELECT name, auto_scan_batch_size, auto_queue_limit FROM ztteam_pages WHERE name = 'Địa điểm Đà Nẵng'");
  console.log(res.rows);
  await client.end();
}
run();
