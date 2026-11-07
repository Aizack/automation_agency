import os

server_path = os.path.join(os.getcwd(), 'src', 'server.ts')
with open(server_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''  // 3. Callback de Embedded Signup OAuth (POST /api/v1/meta/oauth/callback)
  app.post('/api/v1/meta/oauth/callback', authenticateToken as any, async (req: Request, res: Response) => {
    try {
      const { clientId, code } = req.body;
      if (!clientId || !code) {
        return res.status(400).json({ success: false, error: 'clientId y code son requeridos.' });
      }

      const result = await MetaWhatsAppService.exchangeEmbeddedSignupCode(clientId, code);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }

      res.json({ success: true, message: 'Cuenta de Meta del cliente configurada exitosamente.', data: result.data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });'''

replacement = '''  // 3. Callback de Embedded Signup OAuth (POST /api/v1/meta/oauth/callback)
  app.post('/api/v1/meta/oauth/callback', authenticateToken as any, async (req: Request, res: Response) => {
    try {
      const { clientId, code, phoneNumberId, wabaId } = req.body;
      if (!clientId || !code) {
        return res.status(400).json({ success: false, error: 'clientId y code son requeridos.' });
      }

      const result = await MetaWhatsAppService.exchangeEmbeddedSignupCode(clientId, code, phoneNumberId, wabaId);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }

      res.json({ success: true, message: 'Cuenta de Meta del cliente configurada exitosamente.', data: result.data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3.1 Desvincular Meta WhatsApp de un Cliente (POST /api/v1/meta/disconnect)
  app.post('/api/v1/meta/disconnect', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
    try {
      const { clientId } = req.body;
      if (!clientId) {
        return res.status(400).json({ success: false, error: 'clientId es requerido.' });
      }
      await pool.query(
        `UPDATE clients 
         SET meta_wa_token = NULL, 
             meta_phone_number_id = NULL, 
             meta_waba_id = NULL, 
             updated_at = NOW() 
         WHERE id = $1`,
        [clientId]
      );
      res.json({ success: true, message: 'Canal de Meta WhatsApp desvinculado exitosamente.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });'''

content_norm = content.replace('\r\n', '\n')
target_norm = target.replace('\r\n', '\n')
repl_norm = replacement.replace('\r\n', '\n')

if target_norm in content_norm:
    content_norm = content_norm.replace(target_norm, repl_norm, 1)
    with open(server_path, 'w', encoding='utf-8') as f:
        f.write(content_norm)
    print('Updated server.ts successfully')
else:
    print('ERROR: target not found in server.ts')
