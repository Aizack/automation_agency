import paramiko

VPS_IP = '209.145.50.230'
VPS_USER = 'root'
VPS_PASS = 'Kadabrocol0726++'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=10)

def run_cmd(cmd, description=""):
    print(f"=== {description} ===")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out:
        print(f"STDOUT:\n{out}")
    if err:
        print(f"STDERR:\n{err}")
    return out, err

run_cmd("ls -la /root /home /var/www /srv /opt 2>/dev/null", "Top directories")
run_cmd("find /root /home /var/www /srv /opt -name '.git' 2>/dev/null", "Git repos")
run_cmd("cat /etc/nginx/sites-enabled/* /etc/nginx/conf.d/* 2>/dev/null | grep -E 'server_name|proxy_pass|root'", "Nginx Configs")
run_cmd("pm2 status 2>/dev/null || systemctl status agency 2>/dev/null", "Process Managers")

client.close()
