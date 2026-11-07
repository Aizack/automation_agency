with open('src/server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target = """    const selectedDate = new Date(`${date}T00:00:00`);
    const dayOfWeek = selectedDate.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek; // 1 = Lunes, ..., 7 = Domingo
    const zeroBasedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0 = Lunes, ..., 6 = Domingo

    // Acepta coincidencia ya sea que esté guardado en base 1 (ISO 1=Lun..7=Dom o 0..6)
    const isWorkingDay = workingDays.includes(dayOfWeek) || 
                         workingDays.includes(isoDay) || 
                         workingDays.includes(zeroBasedDay);"""

replacement = """    const selectedDate = new Date(`${date}T00:00:00`);
    const dayOfWeek = selectedDate.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek; // 1 = Lunes, ..., 7 = Domingo
    const normalizedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0 = Lunes, ..., 6 = Domingo

    // Acepta coincidencia ya sea que esté guardado en base 1 (ISO 1=Lun..7=Dom o 0..6)
    const isWorkingDay = workingDays.includes(dayOfWeek) || 
                         workingDays.includes(isoDay) || 
                         workingDays.includes(normalizedDay);"""

if target in text:
    text = text.replace(target, replacement)
    with open('src/server.ts', 'w', encoding='utf-8') as f:
        f.write(text)
    print('SUCCESS')
else:
    print('NOT FOUND')
