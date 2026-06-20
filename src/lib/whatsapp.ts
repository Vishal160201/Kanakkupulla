import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';

// Avoid instantiating multiple clients during Next.js Hot Module Replacement
const globalForWA = globalThis as unknown as {
  waClient: Client | undefined;
  waStatus: 'DISCONNECTED' | 'INITIALIZING' | 'AWAITING_QR' | 'READY';
  waQrDataUrl: string | undefined;
};

// Initialize status on first load
if (!globalForWA.waStatus) {
  globalForWA.waStatus = 'DISCONNECTED';
}

export const initWhatsApp = () => {
  if (globalForWA.waClient) {
    return;
  }

  globalForWA.waStatus = 'INITIALIZING';
  
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    }
  });

  client.on('qr', async (qr) => {
    try {
      const url = await qrcode.toDataURL(qr);
      globalForWA.waQrDataUrl = url;
      globalForWA.waStatus = 'AWAITING_QR';
    } catch (e) {
      console.error("Failed to generate QR code", e);
    }
  });

  client.on('ready', () => {
    console.log('WhatsApp Client is READY!');
    globalForWA.waStatus = 'READY';
    globalForWA.waQrDataUrl = undefined;
  });

  client.on('authenticated', () => {
    console.log('WhatsApp Client Authenticated');
    globalForWA.waStatus = 'INITIALIZING';
    globalForWA.waQrDataUrl = undefined;
  });

  client.on('auth_failure', (msg) => {
    console.error('WhatsApp Authentication failure', msg);
    globalForWA.waStatus = 'DISCONNECTED';
    globalForWA.waQrDataUrl = undefined;
  });

  client.on('disconnected', (reason) => {
    console.log('WhatsApp Client was disconnected', reason);
    globalForWA.waClient = undefined;
    globalForWA.waStatus = 'DISCONNECTED';
    globalForWA.waQrDataUrl = undefined;
  });

  client.initialize().catch(err => {
    console.error("WhatsApp Initialization Error:", err);
    globalForWA.waStatus = 'DISCONNECTED';
    globalForWA.waClient = undefined;
  });

  globalForWA.waClient = client;
};

export const getWhatsAppStatus = () => {
  return {
    status: globalForWA.waStatus,
    qrCode: globalForWA.waQrDataUrl
  };
};

export const disconnectWhatsApp = async () => {
  if (globalForWA.waClient) {
    try {
      await globalForWA.waClient.logout();
    } catch (e) {
      console.error(e);
    }
    globalForWA.waClient = undefined;
    globalForWA.waStatus = 'DISCONNECTED';
    globalForWA.waQrDataUrl = undefined;
  }
};

export const sendWhatsAppMessage = async (toPhoneNumber: string, message: string) => {
  if (globalForWA.waStatus !== 'READY' || !globalForWA.waClient) {
    console.log("WhatsApp is not ready. Message skipped.");
    return false;
  }

  try {
    // Format: 919876543210@c.us
    const numericOnly = toPhoneNumber.replace(/\D/g, '');
    const chatId = `${numericOnly}@c.us`;
    await globalForWA.waClient.sendMessage(chatId, message);
    return true;
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
    return false;
  }
};
