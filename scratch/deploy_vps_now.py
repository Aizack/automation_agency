import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

VPS_IP = '209.145.50.230'
VPS_USER = 'root'
VPS_PASS = 'Kadabrocol0726++'

def deploy():
    print("Connecting to VPS via SSH...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=20)

    def run(cmd, desc):
        print(f"\n[VPS] {desc}...")
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='ignore')
        err = stderr.read().decode('utf-8', errors='ignore')
        if out:
            print("STDOUT:\n", out)
        if err:
            print("STDERR:\n", err)
        return out, err

    # 1. Pull latest code on feature/ia-separada
    run("cd /app/agency-bot && git fetch origin && git reset --hard && git checkout feature/ia-separada && git pull origin feature/ia-separada", "Pulling Latest Branch feature/ia-separada")

    # 2. Install dashboard dependencies & build
    run("cd /app/agency-bot/dashboard && npm install && npm run build", "Installing dependencies and building Dashboard")

    # 3. Restart PM2 & Nginx
    run("pm2 restart all || pm2 restart agency-bot", "Restarting PM2 Services")
    run("systemctl reload nginx 2>/dev/null || true", "Reloading Nginx")

    client.close()
    print("\n✅ VPS deployment finished successfully!")

if __name__ == '__main__':
    deploy()
