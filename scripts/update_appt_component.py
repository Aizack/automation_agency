with open('dashboard/src/components/SaaSErpAppointments.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = """        if (availabilityMeta?.blocked && !availableSlots.includes(apptOnlyTime)) {
            setErrorMsg('El horario seleccionado no está disponible para este día. Selecciona otro slot o desbloquea el día.');
            return;
        }"""

replacement = """        if (isSlotBusy(apptOnlyDate, apptOnlyTime)) {
            setErrorMsg('El horario seleccionado ya se encuentra reservado por otra cita activa. Por favor selecciona otro horario.');
            return;
        }"""

if target in text:
    text = text.replace(target, replacement)
    with open('dashboard/src/components/SaaSErpAppointments.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print('SUCCESS')
else:
    print('TARGET NOT FOUND')
