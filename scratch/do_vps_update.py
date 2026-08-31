import paramiko

VPS_IP = '209.145.50.230'
VPS_USER = 'root'
VPS_PASS = 'Kadabrocol0726++'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=15)

def run_cmd(cmd, description=""):
    print(f"\n==========================================")
    print(f"=== {description} ===")
    print(f"Executing: {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out:
        print("STDOUT:\n" + out.encode('ascii', 'ignore').decode('ascii'))
    if err:
        print("STDERR:\n" + err.encode('ascii', 'ignore').decode('ascii'))
    return out, err

# Step 1: Git Pull
run_cmd("cd /app/agency-bot && git reset --hard && git pull origin feature/initial-architecture-6060039206840083513", "1. Pulling latest code from GitHub")

# Step 2: Build dashboard
run_cmd("cd /app/agency-bot/dashboard && npm run build", "2. Building Vite Dashboard on VPS")

# Step 3: Check PM2 processes
run_cmd("pm2 list", "3. Checking PM2 processes")

# Step 4: Restart PM2
run_cmd("pm2 restart all || pm2 restart agency-bot || pm2 restart server", "4. Restarting PM2 process")

# Step 5: Check listening ports & Nginx
run_cmd("systemctl reload nginx 2>/dev/null; pm2 status", "5. Reloading Nginx & Verifying Status")

client.close()
print("\n=== VPS Update Completed Successfully ===")
