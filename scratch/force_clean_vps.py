import paramiko
import os

host = "app.diazlab.online"
username = "root"
password = "Isac*1004"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=username, password=password, timeout=15)

commands = [
    "cd /app/agency-bot && git fetch origin && git reset --hard 96fbaa5c2dc0d062e60733a31cee93e2f2d3b95f && git clean -fd",
    "cd /app/agency-bot/dashboard && rm -rf dist && npm run build",
    "pm2 restart all",
    "systemctl reload nginx"
]

for cmd in commands:
    print(f"--- SSH Executing: {cmd} ---")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    print("STDOUT:", out)
    if err:
        print("STDERR:", err)

ssh.close()
print("✅ VPS CLEAN REBUILD OF 96fbaa5 FINISHED!")
