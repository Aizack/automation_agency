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

sql = "SELECT p.id, p.client_id, c.name as client_name, p.name as prod_name, p.brand, p.sku, p.stock, p.price, p.created_at FROM products p JOIN clients c ON p.client_id = c.id WHERE p.client_id IN ('client_7fc4wswo', 'branch_1788890550133_542') ORDER BY p.created_at DESC LIMIT 50;"
cmd = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql}"'

stdin, stdout, stderr = ssh.exec_command(cmd)
print("STDOUT:")
print(stdout.read().decode('utf-8', errors='ignore'))
print("STDERR:")
print(stderr.read().decode('utf-8', errors='ignore'))
ssh.close()
