import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

VPS_IP = '209.145.50.230'
VPS_USER = 'root'
VPS_PASS = 'Kadabrocol0726++'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=15)

sql_cmd = """
SELECT id, client_id, name, sku, color, stock, has_variants, created_at 
FROM products 
WHERE LOWER(name) LIKE '%l9381%' OR LOWER(sku) LIKE '%l9381%';
"""
cmd = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql_cmd}"'
stdin, stdout, stderr = ssh.exec_command(cmd)
print("=== PRODUCTS MATCHING L9381 ===")
print(stdout.read().decode('utf-8', errors='ignore'))

sql_cmd2 = """
SELECT pv.id, pv.product_id, pv.client_id, pv.variant_name, pv.sku, pv.stock, pv.color_hex, p.name as parent_name
FROM product_variants pv
JOIN products p ON pv.product_id = p.id
WHERE LOWER(p.name) LIKE '%l9381%' OR LOWER(pv.variant_name) LIKE '%l9381%' OR LOWER(pv.sku) LIKE '%l9381%';
"""
cmd2 = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql_cmd2}"'
stdin, stdout, stderr = ssh.exec_command(cmd2)
print("\n=== PRODUCT VARIANTS MATCHING L9381 ===")
print(stdout.read().decode('utf-8', errors='ignore'))

# Check all products with similar names or Luxor brand
sql_cmd3 = """
SELECT id, client_id, name, brand, color, stock, has_variants 
FROM products 
WHERE LOWER(brand) LIKE '%luxor%' OR LOWER(name) LIKE '%luxor%' OR LOWER(name) LIKE '%9381%';
"""
cmd3 = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql_cmd3}"'
stdin, stdout, stderr = ssh.exec_command(cmd3)
print("\n=== PRODUCTS BRAND LUXOR / 9381 ===")
print(stdout.read().decode('utf-8', errors='ignore'))

ssh.close()
