import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

VPS_IP = '209.145.50.230'
VPS_USER = 'root'
VPS_PASS = 'Kadabrocol0726++'

def query_db():
    print("Connecting to VPS via SSH...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=15)

    sql = sys.argv[1] if len(sys.argv) > 1 else "SELECT id, name, parent_client_id, logo_url FROM clients;"
    commands = [
        f"docker exec -i agency_bot_db psql -U agency_user -d agency_db -c \"{sql}\""
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
    query_db()
