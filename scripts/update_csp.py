with open('src/server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('const cspDirectives = [')
end_idx = text.find("].join('; ');", idx) + len("].join('; ');")

new_csp = """const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://apis.google.com https://accounts.google.com https://connect.facebook.net https://graph.facebook.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: https://*.facebook.com https://*.fbcdn.net",
    "connect-src 'self' https: wss: ws: https://*.facebook.com https://*.fbcdn.net https://graph.facebook.com",
    "frame-src 'self' https://*.facebook.com https://*.fbcdn.net https://web.facebook.com",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com https://*.facebook.com"
  ].join('; ');"""

text = text[:idx] + new_csp + text[end_idx:]

with open('src/server.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print('CSP UPDATED SUCCESSFULLY')
