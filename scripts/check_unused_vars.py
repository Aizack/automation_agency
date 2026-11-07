with open('dashboard/src/components/SaaSErpAppointments.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('const [availableSlots, setAvailableSlots]')
print(text[idx-50:idx+400])
