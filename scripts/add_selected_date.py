with open('src/server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target = """    const occupiedSlots = new Set<string>(occupiedRes.rows.map(r => r.slot_time));

    const blockRes = await pool.query("""

replacement = """    const occupiedSlots = new Set<string>(occupiedRes.rows.map(r => r.slot_time));

    const selectedDate = new Date(`${date}T00:00:00`);
    const dayOfWeek = selectedDate.getDay();
    const normalizedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const blockRes = await pool.query("""

if target in text:
    text = text.replace(target, replacement)
    with open('src/server.ts', 'w', encoding='utf-8') as f:
        f.write(text)
    print('SUCCESS')
else:
    print('TARGET NOT FOUND')
