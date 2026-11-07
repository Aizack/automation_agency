with open('src/server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target = "const blockRes = await pool.query("
idx = text.find(target)
print(text[idx-200:idx+50])
