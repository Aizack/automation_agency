import paramiko
import sys

VPS_IP = '209.145.50.230'
VPS_USER = 'root'
VPS_PASS = 'Kadabrocol0726++'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=10)

def run_cmd(cmd, description=""):
    print(f"=== {description} ===")
    print(f"Executing: {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out:
        print(f"STDOUT:\n{out}")
    if err:
        print(f"STDERR:\n{err}")
    return out, err

# Step 1: Check git status in /app/agency-bot
run_cmd("cd /app/agency-bot && git status && git branch -a && git remote -v", "Git Status in /app/agency-bot")

# Step 2: Check PM2 or running processes
run_cmd("pm2 list || docker ps", "Running Processes (PM2 / Docker)")

# Step 3: Check Nginx config for frant-test.diazlab.online
run_cmd("cat /etc/nginx/sites-enabled/* 2>/dev/null", "Nginx Sites Enabled")

client.close()
