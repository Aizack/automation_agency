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

sql_matriz = "SELECT id, name, brand, stock, price, created_at FROM products WHERE client_id = 'client_7fc4wswo' ORDER BY created_at DESC;"
cmd_m = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql_matriz}"'

stdin, stdout, stderr = ssh.exec_command(cmd_m)
print("=== PRODUCTOS ACTUALES EN SEDE MATRIZ ===")
print(stdout.read().decode('utf-8', errors='ignore'))

sql_ciudadela = "SELECT id, name, brand, stock, price, created_at FROM products WHERE client_id = 'branch_1788890550133_542' ORDER BY created_at DESC LIMIT 30;"
cmd_c = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql_ciudadela}"'

stdin, stdout, stderr = ssh.exec_command(cmd_c)
print("\n=== PRODUCTOS EN SEDE CIUDADELA ===")
print(stdout.read().decode('utf-8', errors='ignore'))

ssh.close()
