with open('src/tools/agendarCita.ts', 'r', encoding='utf-8') as f:
    text = f.read()
print(text.encode('ascii', errors='replace').decode('ascii'))
