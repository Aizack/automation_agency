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
UPDATE product_variants pv 
SET client_id = p.client_id 
FROM products p 
WHERE pv.product_id = p.id AND pv.client_id != p.client_id;
"""
cmd = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql_cmd}"'

stdin, stdout, stderr = ssh.exec_command(cmd)
print("STDOUT:")
print(stdout.read().decode('utf-8', errors='ignore'))
print("STDERR:")
print(stderr.read().decode('utf-8', errors='ignore'))

# Re-check count per client_id
check_sql = "SELECT client_id, COUNT(*) FROM product_variants GROUP BY client_id;"
cmd_check = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{check_sql}"'
stdin, stdout, stderr = ssh.exec_command(cmd_check)
print("\n--- UPDATED VARIANT COUNT BY CLIENT_ID ---")
print(stdout.read().decode('utf-8', errors='ignore'))

ssh.close()
