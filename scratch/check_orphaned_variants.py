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
SELECT pv.id as variant_id, pv.product_id, pv.client_id as variant_client_id, p.client_id as product_client_id, p.name as product_name, pv.variant_name
FROM product_variants pv
JOIN products p ON pv.product_id = p.id
WHERE pv.client_id != p.client_id;
"""
cmd = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql_cmd}"'

stdin, stdout, stderr = ssh.exec_command(cmd)
print("--- MISMATCHED VARIANTS (variant_client_id != product_client_id) ---")
print(stdout.read().decode('utf-8', errors='ignore'))

ssh.close()
