const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Global state
let waClient = null;
let waStatus = 'DISCONNECTED'; // 'DISCONNECTED' | 'INITIALIZING' | 'AWAITING_QR' | 'READY' | 'ERROR'
let waQrDataUrl = null;
let waPairingCode = null;
let waError = null;

const initWhatsApp = () => {
  if (waClient && waStatus !== 'ERROR' && waStatus !== 'DISCONNECTED') {
    return;
  }

  waStatus = 'INITIALIZING';
  waError = null;
  waQrDataUrl = null;
  waPairingCode = null;
  
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      executablePath: process.env.CHROME_BIN || null,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    }
  });

  client.on('qr', async (qr) => {
    try {
      const url = await qrcode.toDataURL(qr);
      waQrDataUrl = url;
      waStatus = 'AWAITING_QR';
      console.log("QR Code received");
    } catch (e) {
      console.error("Failed to generate QR code", e);
    }
  });

  client.on('ready', () => {
    waStatus = 'READY';
    waQrDataUrl = null;
    waPairingCode = null;
    console.log("WhatsApp is READY");
  });

  client.on('authenticated', () => {
    console.log("WhatsApp Authenticated");
  });

  client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
    waStatus = 'ERROR';
    waError = 'Authentication failure: ' + msg;
  });

  client.on('disconnected', (reason) => {
    console.log('WhatsApp Disconnected', reason);
    waStatus = 'DISCONNECTED';
    waClient = null;
  });

  client.initialize().catch(err => {
    console.error("WhatsApp Initialization Error:", err);
    waStatus = 'ERROR';
    waClient = null;
    waError = err instanceof Error ? err.message : String(err);
  });

  waClient = client;
};

// Start initialization immediately
initWhatsApp();

// API Endpoints
app.get('/api/status', (req, res) => {
  res.json({
    status: waStatus,
    qrCode: waQrDataUrl,
    pairingCode: waPairingCode,
    error: waError
  });
});

app.post('/api/pair', async (req, res) => {
  const { phoneNumber } = req.body;
  
  if (!phoneNumber) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  if (waClient && waStatus !== 'READY') {
    try {
      let cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone; // Default to India if 10 digits
      }
      
      const codePromise = waClient.requestPairingCode(cleanPhone);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout getting pairing code from WhatsApp Web JS. The client may be in an unresponsive state.")), 15000)
      );
      
      const code = await Promise.race([codePromise, timeoutPromise]);
      waPairingCode = code;
      
      return res.json({ success: true, code });
    } catch (e) {
      console.error("Error requesting pairing code:", e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Failed to request pairing code" });
    }
  }
  
  return res.status(400).json({ error: "WhatsApp client not available or already connected" });
});

app.post('/api/logout', async (req, res) => {
  if (waClient) {
    try {
      await waClient.logout();
      waStatus = 'DISCONNECTED';
      waClient = null;
      waQrDataUrl = null;
      waPairingCode = null;
      waError = null;
      // Re-initialize for next login
      initWhatsApp();
      return res.json({ success: true });
    } catch (e) {
      console.error("Logout Error:", e);
      return res.status(500).json({ error: "Failed to logout" });
    }
  }
  return res.json({ success: true });
});

// Future endpoint to send messages
app.post('/api/send', async (req, res) => {
  const { to, message } = req.body;
  if (!waClient || waStatus !== 'READY') {
    return res.status(400).json({ error: "WhatsApp is not connected" });
  }
  
  try {
    const formattedNumber = to.replace(/\D/g, '') + "@c.us";
    await waClient.sendMessage(formattedNumber, message);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to send message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

app.listen(port, () => {
  console.log(`WhatsApp Bot Server running on port ${port}`);
});
