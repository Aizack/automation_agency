const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://agency_user:agency_pass@localhost:5432/agency_db' });

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

async function run() {
  const clientId = 'branch_1793300346922_211';
  const date = '2026-11-07';

  const settingsRes = await pool.query(
    'SELECT slot_duration_minutes, opening_time, closing_time, working_days FROM appointment_settings WHERE client_id = $1',
    [clientId]
  );
  console.log('DB settings:', settingsRes.rows[0]);

  const settings = settingsRes.rows[0] || {
    slot_duration_minutes: 30,
    opening_time: '08:00:00',
    closing_time: '18:00:00',
    working_days: [1, 2, 3, 4, 5]
  };

  const slotDuration = Number(settings.slot_duration_minutes || 30);
  const openingTime = settings.opening_time || '08:00:00';
  const closingTime = settings.closing_time || '18:00:00';

  let workingDays = settings.working_days;
  console.log('workingDays from db:', workingDays, typeof workingDays);

  const selectedDate = new Date(`${date}T00:00:00`);
  const dayOfWeek = selectedDate.getDay();
  const normalizedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  console.log({ date, dayOfWeek, normalizedDay, includes: workingDays.includes(normalizedDay) });

  const fullDayBlock = await pool.query(
    "SELECT reason FROM appointment_schedule_blocks WHERE client_id = $1 AND is_active = TRUE AND block_type = 'day' AND target_date = $2",
    [clientId, date]
  );
  console.log('fullDayBlock:', fullDayBlock.rows);

  // Check slot blocks or appointments
  const appts = await pool.query(
    "SELECT * FROM appointments WHERE client_id = $1 AND DATE(appointment_date) = $2 AND status != 'cancelled'",
    [clientId, date]
  );
  console.log('Existing appts:', appts.rows);

  await pool.end();
}

run();
