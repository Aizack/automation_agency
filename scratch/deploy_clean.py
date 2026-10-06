import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def run_deploy():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('209.145.50.230', username='root', password='!*e6+P:!6,5~-0-?~+8]1/5*+?{]Z4_~')
    
    cmds = [
        "cd /app/agency-bot && git fetch origin && git reset --hard origin/feature/ia-separada",
        "cd /app/agency-bot/dashboard && npm run build",
        "pm2 restart 0"
    ]
    for c in cmds:
        stdin, stdout, stderr = ssh.exec_command(c)
        out = stdout.read().decode('utf-8', errors='ignore')
        err = stderr.read().decode('utf-8', errors='ignore')
        print(f"CMD: {c}")
        if out: print("OUT:", out.encode('ascii', errors='replace').decode('ascii'))
        if err: print("ERR:", err.encode('ascii', errors='replace').decode('ascii'))
        
    ssh.close()

if __name__ == '__main__':
    run_deploy()
