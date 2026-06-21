import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';

// Avoid instantiating multiple clients during Next.js Hot Module Replacement
const globalForWA = globalThis as unknown as {
  waClient: Client | undefined;
  waStatus: 'DISCONNECTED' | 'INITIALIZING' | 'AWAITING_QR' | 'READY';
  waQrDataUrl: string | undefined;
  waPairingCode: string | undefined;
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
    globalForWA.waPairingCode = undefined;
  });

  client.on('authenticated', () => {
    console.log('WhatsApp Client Authenticated');
    globalForWA.waStatus = 'INITIALIZING';
    globalForWA.waQrDataUrl = undefined;
    globalForWA.waPairingCode = undefined;
  });

  client.on('auth_failure', (msg) => {
    console.error('WhatsApp Authentication failure', msg);
    globalForWA.waStatus = 'DISCONNECTED';
    globalForWA.waQrDataUrl = undefined;
    globalForWA.waPairingCode = undefined;
  });

  client.on('disconnected', (reason) => {
    console.log('WhatsApp Client was disconnected', reason);
    globalForWA.waClient = undefined;
    globalForWA.waStatus = 'DISCONNECTED';
    globalForWA.waQrDataUrl = undefined;
    globalForWA.waPairingCode = undefined;
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
    qrCode: globalForWA.waQrDataUrl,
    pairingCode: globalForWA.waPairingCode
  };
};

export const requestWAPairingCode = async (phoneNumber: string) => {
  if (globalForWA.waClient && globalForWA.waStatus !== 'READY') {
    try {
      // whatsapp-web.js requires the phone number without '+'
      let cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone; // Default to India if 10 digits
      }
      
      const codePromise = globalForWA.waClient.requestPairingCode(cleanPhone);
      const timeoutPromise = new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout getting pairing code from WhatsApp Web JS. The client may be in an unresponsive state.")), 15000)
      );
      
      const code = await Promise.race([codePromise, timeoutPromise]);
      globalForWA.waPairingCode = code;
      return code;
    } catch (e) {
      console.error(e);
      throw new Error("Failed to request pairing code");
    }
  }
  throw new Error("WhatsApp client not available or already connected");
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
    globalForWA.waPairingCode = undefined;
  }
};

export const sendWhatsAppMessage = async (toPhoneNumber: string, message: string) => {
  if (globalForWA.waStatus !== 'READY' || !globalForWA.waClient) {
    console.log("WhatsApp is not ready. Message skipped.");
    return false;
  }

  try {
    const numericOnly = toPhoneNumber.replace(/\D/g, '');
    const chatId = `${numericOnly}@c.us`;
    await globalForWA.waClient.sendMessage(chatId, message);
    return true;
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
    return false;
  }
};
