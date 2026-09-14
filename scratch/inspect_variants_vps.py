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
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'product_variants';
"""
cmd = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql_cmd}"'

stdin, stdout, stderr = ssh.exec_command(cmd)
print("--- PRODUCT_VARIANTS COLUMNS ---")
print(stdout.read().decode('utf-8', errors='ignore'))

sql_cmd2 = """
SELECT pv.id, pv.product_id, pv.color, pv.sku, pv.stock, p.name as product_name, p.client_id 
FROM product_variants pv
JOIN products p ON pv.product_id = p.id
LIMIT 30;
"""
cmd2 = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql_cmd2}"'

stdin, stdout, stderr = ssh.exec_command(cmd2)
print("\n--- SAMPLE PRODUCT_VARIANTS RECORDS ---")
print(stdout.read().decode('utf-8', errors='ignore'))

sql_cmd3 = """
SELECT p.client_id, COUNT(pv.id) as variant_count 
FROM products p
LEFT JOIN product_variants pv ON p.id = pv.product_id
GROUP BY p.client_id;
"""
cmd3 = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql_cmd3}"'

stdin, stdout, stderr = ssh.exec_command(cmd3)
print("\n--- VARIANT COUNT BY CLIENT_ID ---")
print(stdout.read().decode('utf-8', errors='ignore'))

ssh.close()
