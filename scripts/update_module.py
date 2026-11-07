with open('dashboard/src/components/SaaSErpAiAgentModule.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Update openConnectWarning to pre-load ensureFbSdk
target_open = """  const openConnectWarning = () => {
    setCaptchaInput('');
    setCaptchaError(null);
    setCheckWarning1(false);
    setCheckWarning2(false);
    setMathCaptcha(generateCaptcha());
    setShowConnectModal(true);
  };"""

replacement_open = """  const openConnectWarning = () => {
    setCaptchaInput('');
    setCaptchaError(null);
    setCheckWarning1(false);
    setCheckWarning2(false);
    setMathCaptcha(generateCaptcha());
    setShowConnectModal(true);
    // Precargar el SDK de Facebook en segundo plano
    ensureFbSdk().catch((e) => console.log('[Meta] Precarga SDK:', e));
  };"""

if target_open in text:
    text = text.replace(target_open, replacement_open)
    print('openConnectWarning updated')
else:
    print('target_open not found')

with open('dashboard/src/components/SaaSErpAiAgentModule.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('MODULE UPDATED')
