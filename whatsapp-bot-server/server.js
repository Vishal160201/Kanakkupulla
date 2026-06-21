const express = require('express');
const cors = require('cors');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Global state
let waSocket = null;
let waStatus = 'DISCONNECTED'; // 'DISCONNECTED' | 'INITIALIZING' | 'AWAITING_QR' | 'READY' | 'ERROR'
let waQrDataUrl = null;
let waError = null;

const initWhatsApp = async () => {
  if (waSocket && waStatus !== 'ERROR' && waStatus !== 'DISCONNECTED') {
    return;
  }

  waStatus = 'INITIALIZING';
  waError = null;
  waQrDataUrl = null;

  try {
    const { state, saveCreds } = await useMultiFileAuthState('./.baileys_auth');

    waSocket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }), // Suppress excessive logs
      browser: ['Kanakkupulla Bot', 'Chrome', '1.0.0']
    });

    waSocket.ev.on('creds.update', saveCreds);

    waSocket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Baileys provides the raw QR string, we convert it to a data URL for the frontend
        const qrcode = require('qrcode');
        waQrDataUrl = await qrcode.toDataURL(qr);
        waStatus = 'AWAITING_QR';
        console.log('QR Code received');
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
        
        waStatus = 'DISCONNECTED';
        waSocket = null;

        // Reconnect if not explicitly logged out
        if (shouldReconnect) {
          setTimeout(initWhatsApp, 2000);
        } else {
          // Explicitly logged out, clear auth folder
          const fs = require('fs');
          if (fs.existsSync('./.baileys_auth')) {
             fs.rmSync('./.baileys_auth', { recursive: true, force: true });
          }
        }
      } else if (connection === 'open') {
        console.log('WhatsApp is READY');
        waStatus = 'READY';
        waQrDataUrl = null;
      }
    });

    // Handle incoming messages
    waSocket.ev.on('messages.upsert', async (m) => {
      // Future: add auto-reply logic here if needed
      // const msg = m.messages[0];
      // if (!msg.key.fromMe && m.type === 'notify') {
      //    console.log('replying to', msg.key.remoteJid);
      //    await waSocket.sendMessage(msg.key.remoteJid, { text: 'Hello there!' });
      // }
    });

  } catch (err) {
    console.error("WhatsApp Initialization Error:", err);
    waStatus = 'ERROR';
    waSocket = null;
    waError = err instanceof Error ? err.message : String(err);
  }
};

// Start initialization immediately
initWhatsApp();

// API Endpoints

app.get('/', (req, res) => {
  res.send('WhatsApp Bot Server (Baileys) is running perfectly!');
});

app.get('/api/status', (req, res) => {
  res.json({
    status: waStatus,
    qrCode: waQrDataUrl,
    pairingCode: null, // Baileys supports pairing codes, but we stick to QR for simplicity
    error: waError
  });
});

app.post('/api/logout', async (req, res) => {
  if (waSocket && waStatus === 'READY') {
    try {
      await waSocket.logout();
      waStatus = 'DISCONNECTED';
      waSocket = null;
      res.json({ success: true, message: 'Logged out successfully' });
      
      // Auto-restart to generate new QR
      setTimeout(initWhatsApp, 3000);
    } catch (error) {
      res.status(500).json({ error: 'Failed to logout' });
    }
  } else {
    res.json({ success: true, message: 'Already disconnected' });
    setTimeout(initWhatsApp, 1000);
  }
});

app.post('/api/send', async (req, res) => {
  if (waStatus !== 'READY' || !waSocket) {
    return res.status(400).json({ error: 'WhatsApp is not ready' });
  }

  const { number, message } = req.body;
  
  if (!number || !message) {
    return res.status(400).json({ error: 'Phone number and message are required' });
  }

  try {
    // Baileys requires the jid format: number@s.whatsapp.net
    const jid = number.includes('@s.whatsapp.net') ? number : `${number}@s.whatsapp.net`;
    
    await waSocket.sendMessage(jid, { text: message });
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to send message:", error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.listen(port, () => {
  console.log(`WhatsApp Bot server listening on port ${port}`);
});
