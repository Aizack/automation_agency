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
WHERE created_at >= '2026-09-08 00:00:00'
ORDER BY created_at ASC;
"""
cmd1 = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql1}"'
stdin, stdout, stderr = ssh.exec_command(cmd1)
print("=== PRODUCTS CREATED ON 2026-09-08 ===")
print(stdout.read().decode('utf-8', errors='ignore'))

sql2 = """
SELECT pv.id, pv.product_id, pv.client_id, pv.variant_name, pv.sku, pv.stock, p.name as parent_name, pv.created_at
FROM product_variants pv
JOIN products p ON pv.product_id = p.id
WHERE pv.created_at >= '2026-09-08 00:00:00'
ORDER BY pv.created_at ASC;
"""
cmd2 = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql2}"'
stdin, stdout, stderr = ssh.exec_command(cmd2)
print("\n=== PRODUCT VARIANTS CREATED ON 2026-09-08 ===")
print(stdout.read().decode('utf-8', errors='ignore'))

ssh.close()
