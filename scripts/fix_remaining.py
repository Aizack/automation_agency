with open('src/server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("AND status != 'cancelled'", "AND status NOT IN ('cancelled', 'annulled', 'anulada')")
text = text.replace("status != 'cancelled'", "status NOT IN ('cancelled', 'annulled', 'anulada')")
text = text.replace("AND (status IS NULL OR status != 'cancelled')", "AND (status IS NULL OR status NOT IN ('cancelled', 'annulled', 'anulada'))")

with open('src/server.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated remaining occurrences successfully')
