import { useState, useEffect } from "react";
import { signIn, useSession, getProviders } from "next-auth/react";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";

export default function Integrations() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  
  // Custom disconnect UI state
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [disconnectInput, setDisconnectInput] = useState("");

  useEffect(() => {
    fetchStatus();
    
    // Check for inline error from NextAuth signin callback
    const errorParam = searchParams.get('error');
    const expectedEmail = searchParams.get('expectedEmail');
    
    if (errorParam === 'DriveEmailMismatch' && expectedEmail) {
      toast.error(`This app is linked to ${expectedEmail}. Please sign in with the same account.`);
      // Clean up URL to avoid repeating on refresh
      router.replace('/settings', undefined);
    }
  }, [searchParams]);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/integrations/google");
      if (res.ok) {
        const data = await res.json();
        setIsConnected(data.connected);
        setEmail(data.email || null);
        setNeedsReauth(!!data.reauthRequired);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const providers = await getProviders();
      if (!providers || !providers['google-drive']) {
        toast.error("Google Drive integration is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file.");
        return;
      }
      
      signIn("google-drive", {
        callbackUrl: "/settings",
        login_hint: session?.user?.email ?? "",
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to initiate connection. Please try again.");
    }
  };

  const handleDisconnect = async () => {
    if (disconnectInput !== 'DISCONNECT') {
      toast.error("Please type DISCONNECT to confirm.");
      return;
    }
    
    setIsDisconnecting(true);
    try {
      await fetch("/api/integrations/google", { method: "DELETE" });
      setIsConnected(false);
      setEmail(null);
      setShowDisconnectConfirm(false);
      setDisconnectInput("");
      toast.success("Google Drive disconnected successfully");
    } catch (e) {
      console.error(e);
      toast.error("Failed to disconnect Google Drive");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const isAdmin = (session?.user as any)?.role === "ADMIN";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Integrations</h2>
          <p className="text-[0.95rem] text-slate-500 mt-1">Connect third-party apps and services</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Google Drive Card */}
        <div className="border border-gray-200 rounded-xl p-6 transition-all duration-300 hover:shadow-md bg-slate-50/50">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 87.3 126.8" className="w-7 h-7">
                <path fill="#0066da" d="M58.3 126.8L29.1 76.5l-29 50.3h58.2z" />
                <path fill="#00ac47" d="M87.3 76.5L58.2 26.2 29.1 76.5h58.2z" />
                <path fill="#ea4335" d="M0 76.5l29.1-50.3h58.2L58.2 26.2 29.1 26.2 0 76.5z" />
                <path fill="#00832d" d="M87.3 76.5L58.2 26.2v0L29.1 76.5h58.2z" />
                <path fill="#2684fc" d="M58.3 126.8L29.1 76.5l-29 50.3v0h58.2z" />
                <path fill="#ffba00" d="M58.2 26.2L29.1 76.5 0 26.2h58.2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800">Google Drive</h3>
              <p className="text-xs text-slate-500">Cloud Storage</p>
            </div>
            {isLoading ? (
              <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin"></div>
            ) : isConnected ? (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-md flex items-center gap-1">
                <i className="ph-fill ph-check-circle"></i> Connected
              </span>
            ) : null}
          </div>

          <p className="text-[0.9rem] text-slate-600 mb-6 min-h-[40px]">
            Connect your Google Drive to easily pick and attach files directly to orders and bookings.
          </p>

          <div className="flex flex-col border-t border-gray-200/60 pt-4">
            {!isLoading && isConnected ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 truncate max-w-[150px]" title={email || "Connected"}>
                    {email || "Connected"}
                  </span>
                  
                  {isAdmin && !showDisconnectConfirm && (
                    <button
                      onClick={() => setShowDisconnectConfirm(true)}
                      className="px-4 py-2 bg-red-50 text-red-600 text-sm font-bold rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
                
                {showDisconnectConfirm && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl animate-in fade-in slide-in-from-top-2">
                    <p className="text-[0.85rem] text-red-600 font-bold mb-3 leading-relaxed">
                      Disconnecting will not delete existing Drive files but new uploads will stop working. Type <span className="bg-red-100 px-1.5 py-0.5 rounded text-red-700 font-mono">DISCONNECT</span> to confirm.
                    </p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="DISCONNECT" 
                        value={disconnectInput}
                        onChange={e => setDisconnectInput(e.target.value)}
                        className="flex-1 bg-white border border-red-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500/20"
                      />
                      <button
                        onClick={handleDisconnect}
                        disabled={isDisconnecting || disconnectInput !== 'DISCONNECT'}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:hover:bg-red-600"
                      >
                        {isDisconnecting ? "..." : "Confirm"}
                      </button>
                      <button
                        onClick={() => {
                          setShowDisconnectConfirm(false);
                          setDisconnectInput("");
                        }}
                        disabled={isDisconnecting}
                        className="px-3 py-2 bg-white border border-red-200 text-red-600 text-sm font-bold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : !isLoading ? (
              <button
                onClick={handleConnect}
                className="w-full px-4 py-2 bg-white border border-gray-300 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 mt-2"
              >
                <i className="ph-bold ph-plugs"></i>
                {needsReauth ? "Reconnect Google Drive" : "Connect Google Drive"}
              </button>
            ) : (
              <div className="h-9"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}