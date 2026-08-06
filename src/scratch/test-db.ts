import { listClients } from '../database/clientsCrud';
import { pool } from '../database/postgres';

async function test() {
  try {
    console.log("Testing listClients()...");
    const clients = await listClients();
    console.log("Clients count:", clients.length);
    console.log("Clients data:", JSON.stringify(clients, null, 2));
  } catch (err) {
    console.error("Error listing clients:", err);
  } finally {
    await pool.end();
  }
}

test();
