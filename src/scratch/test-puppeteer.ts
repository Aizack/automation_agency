import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function test() {
    console.log("🚀 [TEST PUPPETEER] Iniciando navegador Chrome...");
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--disable-extensions'
        ]
    });
    
    const page = (await browser.pages())[0] || await browser.newPage();
    
    // Configurar el User Agent moderno para evitar bloqueos
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    await page.setUserAgent(userAgent);
    
    console.log("🌐 [TEST PUPPETEER] Navegando a https://web.whatsapp.com/ ...");
    await page.goto('https://web.whatsapp.com/', { 
        waitUntil: 'networkidle2', 
        timeout: 60000 
    });
    
    const title = await page.title();
    console.log(`📄 [TEST PUPPETEER] Título de la página: "${title}"`);
    
    console.log("🕒 [TEST PUPPETEER] Esperando 15 segundos para que cargue completamente...");
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    const screenshotPath = path.join(process.cwd(), 'wa-screenshot.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`📸 [TEST PUPPETEER] Captura de pantalla guardada en: ${screenshotPath}`);
    
    await browser.close();
    console.log("👋 [TEST PUPPETEER] Prueba finalizada.");
}

test().catch((err) => {
    console.error("❌ [TEST PUPPETEER] Error durante la ejecución:", err);
    process.exit(1);
});
