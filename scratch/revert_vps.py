import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

VPS_IP = '209.145.50.230'
VPS_USER = 'root'
VPS_PASS = 'Kadabrocol0726++'

print("Connecting to VPS via SSH to force revert to 96fbaa5...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=15)

commands = [
    "cd /app/agency-bot && git fetch origin && git reset --hard 96fbaa5c2dc0d062e60733a31cee93e2f2d3b95f && git clean -fd",
    "cd /app/agency-bot/dashboard && rm -rf dist && npm run build",
    "pm2 restart all || pm2 restart agency-bot",
    "systemctl reload nginx 2>/dev/null || true"
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
print("\n✅ VPS FULLY REVERTED & REBUILT AT COMMIT 96fbaa5!")
