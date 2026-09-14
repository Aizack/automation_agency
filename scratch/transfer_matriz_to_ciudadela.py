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

sql_cmd = "UPDATE products SET client_id = 'branch_1788890550133_542' WHERE client_id = 'client_7fc4wswo' AND created_at >= '2026-09-08 00:00:00';"
cmd = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql_cmd}"'

stdin, stdout, stderr = ssh.exec_command(cmd)
print("STDOUT:")
print(stdout.read().decode('utf-8', errors='ignore'))
print("STDERR:")
print(stderr.read().decode('utf-8', errors='ignore'))

# Check count in Matriz vs Ciudadela
check_sql = "SELECT client_id, count(*) FROM products WHERE client_id IN ('client_7fc4wswo', 'branch_1788890550133_542') GROUP BY client_id;"
cmd_check = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{check_sql}"'
stdin, stdout, stderr = ssh.exec_command(cmd_check)
print("\n--- RESUMEN CONTEO DE PRODUCTOS POR SEDE ---")
print(stdout.read().decode('utf-8', errors='ignore'))

ssh.close()
