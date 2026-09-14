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
WHERE table_name = 'lab_jobs';
"""
cmd = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql_cmd}"'
stdin, stdout, stderr = ssh.exec_command(cmd)
print("=== LAB_JOBS COLUMNS ===")
print(stdout.read().decode('utf-8', errors='ignore'))

sql_cmd2 = """
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'formulas';
"""
cmd2 = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql_cmd2}"'
stdin, stdout, stderr = ssh.exec_command(cmd2)
print("\n=== FORMULAS COLUMNS ===")
print(stdout.read().decode('utf-8', errors='ignore'))

sql_cmd3 = """
SELECT * FROM lab_jobs LIMIT 5;
"""
cmd3 = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql_cmd3}"'
stdin, stdout, stderr = ssh.exec_command(cmd3)
print("\n=== SAMPLE LAB_JOBS ===")
print(stdout.read().decode('utf-8', errors='ignore'))

ssh.close()
