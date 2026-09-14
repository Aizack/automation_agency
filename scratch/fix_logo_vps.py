import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

VPS_IP = '209.145.50.230'
VPS_USER = 'root'
VPS_PASS = 'Kadabrocol0726++'

def fix_logo():
    print("Connecting to VPS via SSH...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=15)

    commands = [
        "mkdir -p /app/agency-bot/media/clients/client_7fc4wswo/logos",
        "cp /app/agency-bot/media/clients/branch_1788890550133_542/logos/logo_1788986529338.webp /app/agency-bot/media/clients/client_7fc4wswo/logos/logo_1788986529338.webp",
        "chmod -R 777 /app/agency-bot/media /app/agency-bot/uploads",
        "docker exec -i agency_bot_db psql -U agency_user -d agency_db -c \"UPDATE clients SET logo_url = '/media/clients/client_7fc4wswo/logos/logo_1788986529338.webp' WHERE id = 'client_7fc4wswo';\"",
        "docker exec -i agency_bot_db psql -U agency_user -d agency_db -c \"SELECT id, name, logo_url FROM clients WHERE id IN ('client_7fc4wswo', 'branch_1788890550133_542');\""
    ]

    for cmd in commands:
        print(f"\n--- Running: {cmd} ---")
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='ignore')
        err = stderr.read().decode('utf-8', errors='ignore')
        if out:
            print("STDOUT:\n", out)
        if err:
            print("STDERR:\n", err)

    client.close()

if __name__ == '__main__':
    fix_logo()
