with open('dashboard/src/components/SaaSErpAiAgentModule.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = """      fbInstance.login(async (response: any) => {
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
      });"""

replacement = """      const handleFbResponse = async (response: any) => {
        if (safetyTimer) clearTimeout(safetyTimer);
        console.log('[Meta] Respuesta de FB.login recibida:', response);
        window.removeEventListener('message', sessionHandler);
        if (response?.authResponse?.code) {
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
      };

      // Facebook SDK exige estrictamente una función estándar (Function), no AsyncFunction
      fbInstance.login(function(response: any) {
        handleFbResponse(response);
      }, {
        config_id: '1789269002280145',
        response_type: 'code',
        override_default_response_type: true,
        extras: { version: 'v4' }
      });"""

if target in text:
    text = text.replace(target, replacement)
    with open('dashboard/src/components/SaaSErpAiAgentModule.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print('SUCCESS')
else:
    print('TARGET NOT FOUND')
