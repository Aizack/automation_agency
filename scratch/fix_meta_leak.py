import paramiko

def fix_leak():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('209.145.50.230', username='root', password='!*e6+P:!6,5~-0-?~+8]1/5*+?{]Z4_~')
    
    cmd = """docker exec agency_bot_db psql -U agency_user -d agency_db -c "
    UPDATE clients 
    SET meta_phone_number_id = NULL, 
        meta_waba_id = NULL, 
        meta_wa_token = NULL 
    WHERE id != 'admin' 
      AND (meta_phone_number_id = '1325606987308762' OR meta_waba_id = '1415552803364935');
    SELECT id, name, meta_phone_number_id, meta_waba_id FROM clients WHERE meta_phone_number_id IS NOT NULL;
    " """
    
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    print("STDOUT:\n", out)
    if err:
        print("STDERR:\n", err)
    ssh.close()

if __name__ == '__main__':
    fix_leak()
