import os

crm_path = 'dashboard/src/components/SaaSErpCRM.tsx'
with open(crm_path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('<option value="TI">Tarjeta Id. (TI)</option>', '<option value="TI">Tarjeta id. (T.I.)</option>')
with open(crm_path, 'w', encoding='utf-8') as f:
    f.write(content)

hist_path = 'dashboard/src/components/HistoricalInvoicesModal.tsx'
with open(hist_path, 'r', encoding='utf-8') as f:
    content = f.read()
if 'value="TI"' not in content:
    content = content.replace('<option value="CC">Cédula (CC)</option>', '<option value="CC">Cédula (CC)</option>\n                                            <option value="TI">Tarjeta id. (T.I.)</option>')
    with open(hist_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Python script completed TI updates successfully!")
