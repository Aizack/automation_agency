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

sql1 = """
SELECT id, client_id, name, brand, sku, color, stock, has_variants, created_at 
FROM products 
WHERE LOWER(name) LIKE '%9381%' OR LOWER(color) LIKE '%gris%' OR LOWER(sku) LIKE '%9381%' OR LOWER(description) LIKE '%9381%';
"""
cmd1 = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql1}"'
stdin, stdout, stderr = ssh.exec_command(cmd1)
print("=== PRODUCTS matching 9381 or color Gris ===")
print(stdout.read().decode('utf-8', errors='ignore'))

sql2 = """
SELECT pv.id, pv.product_id, pv.client_id, pv.variant_name, pv.sku, pv.stock, p.name as parent_name, p.client_id as parent_client_id
FROM product_variants pv
LEFT JOIN products p ON pv.product_id = p.id
WHERE LOWER(pv.variant_name) LIKE '%gris%' OR LOWER(pv.sku) LIKE '%9381%' OR LOWER(p.name) LIKE '%9381%';
"""
cmd2 = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql2}"'
stdin, stdout, stderr = ssh.exec_command(cmd2)
print("\n=== PRODUCT VARIANTS matching 9381 or Gris ===")
print(stdout.read().decode('utf-8', errors='ignore'))

# Check all products in client_7fc4wswo (Matriz)
sql3 = """
SELECT id, client_id, name, brand, color, stock, has_variants, created_at 
FROM products 
WHERE client_id = 'client_7fc4wswo';
"""
cmd3 = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql3}"'
stdin, stdout, stderr = ssh.exec_command(cmd3)
print("\n=== ALL PRODUCTS IN MATRIZ (client_7fc4wswo) ===")
print(stdout.read().decode('utf-8', errors='ignore'))

ssh.close()
