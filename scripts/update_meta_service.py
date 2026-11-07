import os

file_path = os.path.join(os.getcwd(), 'src', 'services', 'metaWhatsAppService.ts')
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''  static async exchangeEmbeddedSignupCode(clientId: string, code: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const appId = process.env.META_APP_ID || '';
      const appSecret = process.env.META_APP_SECRET || '';

      if (!appId || !appSecret) {
        return { success: false, error: 'META_APP_ID o META_APP_SECRET no configurados en el servidor.' };
      }

      const url = `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`;
      const response = await fetch(url);
      const resData: any = await response.json();

      if (!response.ok || !resData.access_token) {
        return { success: false, error: resData.error?.message || 'Error al intercambiar token OAuth' };
      }

      const accessToken = resData.access_token;

      // Guardar el token devuelto en la base de datos para este cliente
      await pool.query(
        `UPDATE clients SET meta_wa_token = $1, updated_at = NOW() WHERE id = $2`,
        [accessToken, clientId]
      );

      return { success: true, data: { accessToken } };
    } catch (err: any) {
      console.error('[Meta Embedded Signup] Error en intercambio de token:', err);
      return { success: false, error: err.message };
    }
  }'''

replacement = '''  static async exchangeEmbeddedSignupCode(
    clientId: string, 
    code: string,
    phoneNumberId?: string,
    wabaId?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const appId = process.env.META_APP_ID || '';
      const appSecret = process.env.META_APP_SECRET || '';

      if (!appId || !appSecret) {
        return { success: false, error: 'META_APP_ID o META_APP_SECRET no configurados en el servidor.' };
      }

      const url = `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`;
      const response = await fetch(url);
      const resData: any = await response.json();

      if (!response.ok || !resData.access_token) {
        return { success: false, error: resData.error?.message || 'Error al intercambiar token OAuth' };
      }

      const accessToken = resData.access_token;

      // Guardar token y credenciales en base de datos para este cliente
      await pool.query(
        `UPDATE clients 
         SET meta_wa_token = $1, 
             meta_phone_number_id = COALESCE($3, meta_phone_number_id),
             meta_waba_id = COALESCE($4, meta_waba_id),
             updated_at = NOW() 
         WHERE id = $2`,
        [accessToken, clientId, phoneNumberId || null, wabaId || null]
      );

      // Auto-registrar número en Meta Cloud API si fue provisto
      if (phoneNumberId) {
        try {
          await this.registerPhoneNumber(phoneNumberId, accessToken);
          console.log(`[Meta Embedded Signup] Número ${phoneNumberId} autoregistrado con éxito.`);
        } catch (regErr) {
          console.warn('[Meta Embedded Signup] Advertencia al autoregistrar número:', regErr);
        }
      }

      // Auto-suscribir app a webhooks de WABA si fue provisto
      if (wabaId) {
        try {
          await fetch(`https://graph.facebook.com/v20.0/${wabaId}/subscribed_apps`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          console.log(`[Meta Embedded Signup] Webhook suscrito a WABA ${wabaId}.`);
        } catch (subErr) {
          console.warn('[Meta Embedded Signup] Advertencia suscribiendo WABA a webhooks:', subErr);
        }
      }

      return { success: true, data: { accessToken, phoneNumberId, wabaId } };
    } catch (err: any) {
      console.error('[Meta Embedded Signup] Error en intercambio de token:', err);
      return { success: false, error: err.message };
    }
  }'''

content_norm = content.replace('\r\n', '\n')
target_norm = target.replace('\r\n', '\n')
repl_norm = replacement.replace('\r\n', '\n')

if target_norm in content_norm:
    content_norm = content_norm.replace(target_norm, repl_norm, 1)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content_norm)
    print('Updated metaWhatsAppService.ts successfully')
else:
    print('ERROR: target not found in metaWhatsAppService.ts')
