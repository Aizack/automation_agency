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
SELECT * FROM inventory_transfers 
WHERE LOWER(product_name) LIKE '%l9381%';
"""
cmd = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql_cmd}"'
stdin, stdout, stderr = ssh.exec_command(cmd)
print("=== INVENTORY TRANSFERS FOR L9381 ===")
print(stdout.read().decode('utf-8', errors='ignore'))

sql_cmd2 = """
SELECT * FROM system_audit_logs 
WHERE LOWER(details) LIKE '%l9381%' OR LOWER(entity_id) = 'a455732d-12ae-4409-8083-92c9d533702d';
"""
cmd2 = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql_cmd2}"'
stdin, stdout, stderr = ssh.exec_command(cmd2)
print("\n=== SYSTEM AUDIT LOGS FOR L9381 ===")
print(stdout.read().decode('utf-8', errors='ignore'))

ssh.close()
