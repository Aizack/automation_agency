with open('src/server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find("app.get('/api/clients/:clientId/appointments/availability'")
end_idx = text.find("const fullDayBlock = await pool.query(", idx)

old_block = text[idx:end_idx]
print('OLD BLOCK:')
print(old_block)

new_block = """app.get('/api/clients/:clientId/appointments/availability', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ success: false, error: 'El parámetro date es requerido (YYYY-MM-DD).' });
    }

    const settingsRes = await pool.query(
      `SELECT slot_duration_minutes, opening_time, closing_time, working_days
       FROM appointment_settings
       WHERE client_id = $1`,
      [clientId]
    );

    const settings = settingsRes.rows[0] || {
      slot_duration_minutes: 30,
      opening_time: '08:00:00',
      closing_time: '19:00:00'
    };

    const slotDuration = Number(settings.slot_duration_minutes || 30);
    const openingTime = settings.opening_time || '08:00:00';
    const closingTime = settings.closing_time || '19:00:00';

    // Agenda 100% abierta por defecto. El negocio tiene el control total de sus citas.
    // Solo se bloquea si el propio negocio registró un bloqueo manual explícito en appointment_schedule_blocks:
    """

text = text[:idx] + new_block + text[end_idx:]

with open('src/server.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print('SERVER AVAILABILITY COMPLETELY UNLOCKED')
