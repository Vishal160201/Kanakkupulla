"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const WHATSAPP_ENABLED = false;

export default function WhatsAppIntegration() {
  const { data: session } = useSession();
  const isAdminOrOwner = (session?.user as any)?.role === "ADMIN" || (session?.user as any)?.role === "OWNER";
  
  const { data: waStatusData, mutate: mutateWA } = useSWR(
    isAdminOrOwner ? "/api/whatsapp/status" : null,
    fetcher
  );

  const [waPhoneNumber, setWaPhoneNumber] = useState("");
  const [isPairingLoading, setIsPairingLoading] = useState(false);

  const requestPairingCode = async () => {
    if (!waPhoneNumber) return;
    setIsPairingLoading(true);
    try {
      const res = await fetch('/api/whatsapp/pair', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: waPhoneNumber }),
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error("Failed to get pairing code: " + (data.error || "Please try again or check your server logs. WhatsApp may have rate-limited this number."));
      }
      mutateWA();
    } catch (e) {
      toast.error("Failed to get pairing code. Please try again.");
    } finally {
      setIsPairingLoading(false);
    }
  };

  if (!isAdminOrOwner) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
        <p className="text-slate-500 text-center">Only administrators can manage the WhatsApp integration.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              WhatsApp Bot
              {!WHATSAPP_ENABLED && (
                <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 text-[0.65rem] font-bold rounded-md uppercase tracking-wider">Coming Soon</span>
              )}
            </h2>
            <p className="text-[0.95rem] text-slate-500 mt-1">Connect a WhatsApp Bot for automated notifications</p>
          </div>
        </div>
      </div>

      <div className={`border border-gray-200 rounded-xl p-6 transition-all duration-300 max-w-xl mx-auto bg-slate-50/50 ${
        !WHATSAPP_ENABLED ? "opacity-50 grayscale pointer-events-none select-none" : "hover:shadow-md"
      }`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <i className="ph-fill ph-whatsapp-logo text-green-600 text-2xl"></i>
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Connection Status</h3>
              <div className="flex items-center gap-1.5 mt-1">
                {!waStatusData ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-[0.75rem] font-bold text-blue-500">Connecting...</span>
                  </>
                ) : (
                  <>
                    <div className={`w-2 h-2 rounded-full ${waStatusData.status === 'READY' ? 'bg-green-500' : waStatusData.status === 'AWAITING_QR' ? 'bg-yellow-500 animate-pulse' : waStatusData.status === 'ERROR' ? 'bg-red-600' : 'bg-red-500'}`}></div>
                    <span className="text-[0.75rem] font-bold text-slate-500">{waStatusData.status === 'READY' ? 'Connected' : waStatusData.status === 'AWAITING_QR' ? 'Login Required' : waStatusData.status === 'ERROR' ? 'Error' : 'Disconnected'}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {!waStatusData ? (
          <div className="flex flex-col items-center p-6 bg-blue-50 rounded-xl border border-blue-100 gap-3">
            <i className="ph-fill ph-spinner-gap text-blue-500 text-3xl animate-spin"></i>
            <span className="text-sm text-blue-600 text-center font-semibold">Waking up bot server...</span>
            <span className="text-xs text-blue-400 text-center">This can take up to 60 seconds on Render.</span>
          </div>
        ) : waStatusData.status === 'ERROR' ? (
          <div className="flex flex-col items-center p-6 bg-red-50 rounded-xl border border-red-100 gap-3">
            <i className="ph-fill ph-warning-circle text-red-500 text-3xl"></i>
            <span className="text-sm text-red-600 text-center font-semibold">Failed to start WhatsApp Bot in this environment.</span>
            <span className="text-xs text-red-400 text-center break-all">{waStatusData.error || "Unknown Error"}</span>
            <button onClick={() => { fetch('/api/whatsapp/status'); mutateWA(); }} className="mt-2 px-4 py-2 bg-red-100 text-red-600 text-sm font-bold rounded hover:bg-red-200 transition-colors">
              Retry Connection
            </button>
          </div>
        ) : waStatusData.status === 'READY' ? (
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
              <p className="text-sm text-green-700 text-center">
                Your WhatsApp Bot is active and ready to send notifications.
              </p>
            </div>
            <button 
              onClick={async () => {
                await fetch('/api/whatsapp/logout', { method: 'POST' });
                mutateWA();
              }}
              className="w-full py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors"
            >
              Disconnect Bot
            </button>
          </div>
        ) : waStatusData.pairingCode ? (
          <div className="flex flex-col items-center p-6 bg-slate-50 rounded-xl border border-gray-200">
            <span className="text-[2rem] font-mono font-bold tracking-[0.2em] text-slate-800">{waStatusData.pairingCode.match(/.{1,4}/g)?.join('-') || waStatusData.pairingCode}</span>
            <span className="text-sm text-slate-500 mt-4 text-center">Open WhatsApp &gt; Linked Devices &gt; Link with Phone Number</span>
          </div>
        ) : waStatusData.qrCode ? (
          <div className="flex flex-col items-center p-6 bg-slate-50 rounded-xl border border-gray-200">
            <img src={waStatusData.qrCode} alt="WhatsApp Login QR" className="w-full max-w-[200px] rounded-xl shadow-sm border border-gray-100" />
            <span className="text-sm text-slate-500 mt-4 text-center font-medium">Open WhatsApp &gt; Linked Devices &gt; Scan QR</span>
            
            <div className="w-full mt-6 pt-6 border-t border-gray-200 flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase text-center tracking-wider">OR Link with Phone</span>
              <div className="flex gap-2">
                <input type="text" value={waPhoneNumber} onChange={e => setWaPhoneNumber(e.target.value)} placeholder="+919876543210" className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 bg-white" />
                <button onClick={requestPairingCode} disabled={isPairingLoading} className="px-4 py-2 bg-green-500 text-white text-sm font-bold rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors min-w-[100px]">
                  {isPairingLoading ? '...' : 'Get Code'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
