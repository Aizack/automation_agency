with open('src/server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find("app.post('/api/clients/:clientId/appointments'")
print(text[idx:idx+2500])
