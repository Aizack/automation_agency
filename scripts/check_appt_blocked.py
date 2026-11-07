with open('dashboard/src/components/SaaSErpAppointments.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
print('Occurrences of blocked:', len(re.findall(r'blocked', text)))
for m in re.finditer(r'availabilityMeta', text):
    idx = m.start()
    print(text[max(0, idx-50):min(len(text), idx+150)].encode('ascii', errors='replace').decode('ascii'))
    print('-'*50)
