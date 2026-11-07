import subprocess, os, shutil

# Remove the pointer file .git
os.remove('.git')

# Initialize real git repo
subprocess.run(['git', 'init'], check=True)
subprocess.run(['git', 'remote', 'add', 'origin', 'https://github.com/Aizack/automation_agency'], check=True)
subprocess.run(['git', 'fetch', 'origin', 'feature/meta-whatsapp-embedded-signup'], check=True)
subprocess.run(['git', 'reset', '--soft', 'FETCH_HEAD'], check=True)
subprocess.run(['git', 'branch', '-M', 'feature/meta-whatsapp-embedded-signup'], check=True)
subprocess.run(['git', 'branch', '-u', 'origin/feature/meta-whatsapp-embedded-signup'], check=True)

print('GIT REPAIRED AND LINKED SUCCESSFULLY')
