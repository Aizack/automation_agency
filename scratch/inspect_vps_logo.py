import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

VPS_IP = '209.145.50.230'
VPS_USER = 'root'
VPS_PASS = 'Kadabrocol0726++'

def inspect_vps():
    print("Connecting to VPS via SSH...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=15)

    commands = [
        "docker ps",
        "ls -la /app/agency-bot/media/clients/client_7fc4wswo/logos/ 2>/dev/null || true",
        "ls -la /app/agency-bot/media/clients/branch_1788890550133_542/logos/ 2>/dev/null || true",
        "cat /app/agency-bot/.env | grep DATABASE_URL || true"
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
    inspect_vps()
