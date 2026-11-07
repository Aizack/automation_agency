const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://agency_user:agency_pass@localhost:5432/agency_db' });

async function run() {
  const workingDays = [1, 2, 3, 4, 5]; // Lunes a Viernes
  const days = [
    { name: 'Domingo 8', date: '2026-11-08' },
    { name: 'Lunes 9', date: '2026-11-09' },
    { name: 'Martes 10', date: '2026-11-10' },
    { name: 'Miércoles 11', date: '2026-11-11' },
    { name: 'Jueves 12', date: '2026-11-12' },
    { name: 'Viernes 13', date: '2026-11-13' },
    { name: 'Sábado 14', date: '2026-11-14' },
  ];

  for (const d of days) {
    const selectedDate = new Date(`${d.date}T00:00:00`);
    const dayOfWeek = selectedDate.getDay();
    const normalizedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const isIncluded = workingDays.includes(normalizedDay);
    console.log(`${d.name} (${d.date}): dayOfWeek=${dayOfWeek}, normalizedDay=${normalizedDay} => ${isIncluded ? 'HABILITADO' : '❌ BLOQUEADO'}`);
  }

  await pool.end();
}

run();
