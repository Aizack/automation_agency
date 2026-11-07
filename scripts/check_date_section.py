with open('dashboard/src/components/SaaSErpAppointments.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('Separated Date & Time fields')
print(text[idx-50:idx+600])
