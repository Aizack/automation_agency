with open('src/server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('blockRes = await pool.query')
print(text[idx-50:idx+600])
