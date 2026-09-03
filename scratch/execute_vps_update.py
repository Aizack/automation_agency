import paramiko
import sys

# Ensure UTF-8 output encoding for windows stdout
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

VPS_IP = '209.145.50.230'
VPS_USER = 'root'
VPS_PASS = 'Kadabrocol0726++'

def run_ssh():
    print("Connecting to VPS via SSH...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=15)

    commands = [
        "cd /app/agency-bot && git pull",
        "cd /app/agency-bot/dashboard && npm run build",
        "pm2 restart all || pm2 restart agency-bot",
        "systemctl reload nginx 2>/dev/null || true",
        "pm2 list"
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
    print("\n✅ VPS SSH compilation and PM2 restart finished successfully!")

if __name__ == '__main__':
    run_ssh()
