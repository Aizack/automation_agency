import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

VPS_IP = '209.145.50.230'
VPS_USER = 'root'
VPS_PASS = 'Kadabrocol0726++'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=15)

sql_cmd = """
INSERT INTO product_variants (product_id, client_id, variant_name, sku, price, cost_price, stock, min_stock)
VALUES ('a455732d-12ae-4409-8083-92c9d533702d', 'branch_1788890550133_542', 'Gris', 'L938-GRI-101', 40000, 0, 1, 1);

UPDATE products 
SET color = 'Negro, Gris', 
    stock = (SELECT COALESCE(SUM(stock), 0) FROM product_variants WHERE product_id = 'a455732d-12ae-4409-8083-92c9d533702d') 
WHERE id = 'a455732d-12ae-4409-8083-92c9d533702d';
"""
cmd = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{sql_cmd}"'

stdin, stdout, stderr = ssh.exec_command(cmd)
print("STDOUT:")
print(stdout.read().decode('utf-8', errors='ignore'))
print("STDERR:")
print(stderr.read().decode('utf-8', errors='ignore'))

# Verify updated variants for L9381
check_sql = """
SELECT pv.id, pv.product_id, pv.client_id, pv.variant_name, pv.sku, pv.stock, p.name as parent_name, p.color as parent_colors, p.stock as parent_total_stock
FROM product_variants pv
JOIN products p ON pv.product_id = p.id
WHERE p.id = 'a455732d-12ae-4409-8083-92c9d533702d';
"""
cmd_check = f'docker exec agency_bot_db psql -U agency_user -d agency_db -c "{check_sql}"'
stdin, stdout, stderr = ssh.exec_command(cmd_check)
print("\n--- UPDATED VARIANTS FOR L9381-54-16-140 ---")
print(stdout.read().decode('utf-8', errors='ignore'))

ssh.close()
