with open('dashboard/src/components/SaaSErpAiAgentModule.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('fbInstance.login(async (response: any) => {')
end_idx = text.find('extras: { version: \'v4\' }\n    });', idx) + len('extras: { version: \'v4\' }\n    });')

new_login_block = """    let safetyTimer: any = null;
    safetyTimer = setTimeout(() => {
      setIsConnectingMeta((prev) => {
        if (prev) {
          console.warn('[Meta] Tiempo de espera agotado para FB.login.');
          alert('⚠️ No se detectó la ventana de Facebook. Revisa en la barra de direcciones de tu navegador si tienes las "Ventanas emergentes bloqueadas (Pop-ups)" y autorízalas para frant.app.');
          return false;
        }
        return false;
      });
    }, 45000);

    try {
      console.log('[Meta] Lanzando FB.login con config_id 1789269002280145...');
      fbInstance.login(async (response: any) => {
        if (safetyTimer) clearTimeout(safetyTimer);
        console.log('[Meta] Respuesta de FB.login:', response);
        window.removeEventListener('message', sessionHandler);
        if (response.authResponse?.code) {
          try {
            console.log('[Meta] Enviando código OAuth a backend...');
            const res = await fetch('/api/v1/meta/oauth/callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clientId,
                code: response.authResponse.code,
                phoneNumberId: capturedSessionData?.phone_number_id,
                wabaId: capturedSessionData?.waba_id
              })
            });
            const json = await res.json();
            if (json.success) {
              if (capturedSessionData?.phone_number_id) setMetaPhoneNumberId(capturedSessionData.phone_number_id);
              if (capturedSessionData?.waba_id) setMetaWabaId(capturedSessionData.waba_id);
              if (json.data?.accessToken) setMetaToken(json.data.accessToken);
              alert('🎉 ¡Número oficial de WhatsApp Business vinculado y conectado con Meta Cloud API exitosamente!');
            } else {
              alert('❌ Error vinculando con Meta: ' + (json.error || 'Código rechazado'));
            }
          } catch (err: any) {
            alert('❌ Error de conexión con el servidor: ' + (err.message || 'Error desconocido'));
          } finally {
            setIsConnectingMeta(false);
          }
        } else {
          console.warn('[Meta] El usuario cerró o canceló la ventana de login de Facebook.');
          setIsConnectingMeta(false);
        }
      }, {
        config_id: '1789269002280145',
        response_type: 'code',
        override_default_response_type: true,
        extras: { version: 'v4' }
      });
    } catch (err: any) {
      if (safetyTimer) clearTimeout(safetyTimer);
      console.error('[Meta] Error al invocar FB.login:', err);
      setIsConnectingMeta(false);
      alert('❌ Error al abrir la ventana de Facebook: ' + (err.message || 'Error desconocido'));
    }"""

text = text[:idx] + new_login_block + text[end_idx:]

with open('dashboard/src/components/SaaSErpAiAgentModule.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('UPDATED FB.LOGIN BLOCK WITH SAFETY & LOGS')
