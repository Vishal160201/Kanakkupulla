import { useState, useEffect } from "react";
import Script from "next/script";
import { toast } from "sonner";

// Minimal typings for the parts of the Google API loader / Picker used here.
interface PickerDocument {
  id: string;
  url: string;
  name: string;
  iconUrl: string;
}

type PickerResponse = Record<string, unknown>;

interface PickerBuilder {
  enableFeature(feature: string): PickerBuilder;
  setAppId(appId: string): PickerBuilder;
  setOAuthToken(token: string): PickerBuilder;
  addView(view: unknown): PickerBuilder;
  setDeveloperKey(key: string): PickerBuilder;
  setCallback(callback: (data: PickerResponse) => void): PickerBuilder;
  build(): { setVisible(visible: boolean): void };
}

interface GooglePickerApi {
  DocsView: new (viewId: string) => { setIncludeFolders(include: boolean): void };
  DocsUploadView: new () => unknown;
  PickerBuilder: new () => PickerBuilder;
  ViewId: { DOCS: string };
  Feature: { NAV_HIDDEN: string; MULTISELECT_ENABLED: string };
  Response: { ACTION: string; DOCUMENTS: string };
  Action: { PICKED: string; CANCEL: string };
}

declare global {
  interface Window {
    gapi?: { load(api: string, options: { callback: () => void }): void };
    google?: { picker: GooglePickerApi };
  }
}

interface GooglePickerProps {
  onPick: (file: { id: string; url: string; name: string; iconUrl: string }) => void;
  className?: string;
}

export default function GooglePicker({ onPick, className = "" }: GooglePickerProps) {
  const [isReady, setIsReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  
  // Developer key from env
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";
  const APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID || "";

  useEffect(() => {
    // Check if gapi is loaded
    if (window.gapi) {
      window.gapi.load("picker", { callback: () => setIsReady(true) });
    }
  }, []);

  const handleAuth = async () => {
    try {
      const res = await fetch("/api/integrations/google/token");
      if (!res.ok) {
        throw new Error("Failed to get Google Drive token");
      }
      const data = await res.json();
      setToken(data.accessToken);
      return data.accessToken;
    } catch {
      toast.error("Please connect Google Drive in Settings first.");
      return null;
    }
  };

  const createPicker = async () => {
    const google = window.google;
    if (!isReady || !google) return;
    setIsPickerOpen(true);

    let accessToken = token;
    if (!accessToken) {
      accessToken = await handleAuth();
      if (!accessToken) {
        setIsPickerOpen(false);
        return;
      }
    }

    const { picker: pickerApi } = google;
    const view = new pickerApi.DocsView(pickerApi.ViewId.DOCS);
    view.setIncludeFolders(true);
    
    const picker = new pickerApi.PickerBuilder()
      .enableFeature(pickerApi.Feature.NAV_HIDDEN)
      .enableFeature(pickerApi.Feature.MULTISELECT_ENABLED)
      .setAppId(APP_ID)
      .setOAuthToken(accessToken)
      .addView(view)
      .addView(new pickerApi.DocsUploadView())
      .setDeveloperKey(API_KEY)
      .setCallback(async (data) => {
        if (data[pickerApi.Response.ACTION] === pickerApi.Action.PICKED) {
          const doc = (data[pickerApi.Response.DOCUMENTS] as PickerDocument[])[0];
          
          // Set file to anyone with link can view (so other users in the system can see the thumbnail)
          fetch("/api/integrations/google/share", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileId: doc.id })
          }).catch(console.error);

          onPick({
            id: doc.id,
            url: doc.url,
            name: doc.name,
            iconUrl: doc.iconUrl,
          });
        }
        if (data[pickerApi.Response.ACTION] === pickerApi.Action.CANCEL || 
            data[pickerApi.Response.ACTION] === pickerApi.Action.PICKED) {
          setIsPickerOpen(false);
        }
      })
      .build();
    
    picker.setVisible(true);
  };

  return (
    <>
      <Script 
        src="https://apis.google.com/js/api.js" 
        onLoad={() => {
          if (window.gapi) {
            window.gapi.load("picker", { callback: () => setIsReady(true) });
          }
        }}
      />
      <button
        type="button"
        onClick={createPicker}
        disabled={!isReady || isPickerOpen}
        className={`px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-semibold flex items-center gap-2 transition-colors ${className} ${(!isReady || isPickerOpen) ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <i className="ph-fill ph-google-drive-logo text-lg"></i>
        Pick from Drive
      </button>
    </>
  );
}
