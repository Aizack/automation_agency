import { whatsappState, client } from '../services/whatsapp';

async function check() {
    console.log("Checking WhatsApp status...");
    console.log("whatsappState:", whatsappState);
    if (client) {
        try {
            const info = client.info;
            console.log("Client Info:", info ? {
                wid: info.wid,
                pushname: info.pushname,
                platform: info.platform
            } : "No info available");
        } catch (err) {
            console.error("Error reading client info:", err);
        }
    } else {
        console.log("Client instance is null");
    }
}

// Wait a bit to let any connection resolve
setTimeout(check, 1000);
