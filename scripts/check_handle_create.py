with open('dashboard/src/components/SaaSErpAppointments.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('handleCreateAppt = async')
print(text[idx:idx+1200])
