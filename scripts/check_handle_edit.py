with open('dashboard/src/components/SaaSErpAppointments.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('handleEditAppt = async')
print(text[idx:idx+800])
