import { useEffect, useState } from "react";
import { Apple, Share, Plus, Smartphone, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true);

const InstallAppButtons = () => {
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  const [openGuide, setOpenGuide] = useState<"ios" | "android" | null>(null);

  useEffect(() => {
    setInstalled(isStandalone());

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setOpenGuide(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleAndroid = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    setOpenGuide("android");
  };

  if (installed) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-bold text-background">
        <Download className="h-4 w-4" />
        Collabor8 is on your home screen
      </div>
    );
  }

  return (
    <>
      <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={() => setOpenGuide("ios")}
          className="group flex flex-1 items-center justify-center gap-3 rounded-full bg-foreground px-7 py-4 text-sm font-bold text-background transition-all hover:scale-105 hover:shadow-lg active:scale-95"
        >
          <Apple className="h-5 w-5" />
          Get the app on iPhone
        </button>

        <button
          onClick={handleAndroid}
          className="group flex flex-1 items-center justify-center gap-3 rounded-full border border-foreground/20 bg-background/80 px-7 py-4 text-sm font-bold text-foreground backdrop-blur-sm transition-all hover:scale-105 hover:shadow-lg active:scale-95"
        >
          <Smartphone className="h-5 w-5" />
          Get the app on Android
        </button>
      </div>

      <Dialog open={openGuide !== null} onOpenChange={(open) => !open && setOpenGuide(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {openGuide === "ios" ? "Add Collabor8 to your iPhone" : "Add Collabor8 to your Android"}
            </DialogTitle>
            <DialogDescription>
              It takes a few seconds and works just like an app on your home screen.
            </DialogDescription>
          </DialogHeader>

          {openGuide === "ios" ? (
            <ol className="space-y-4 text-sm text-foreground">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-foreground">
                  1
                </span>
                <span>Open collaborate8.com in Safari on your iPhone.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-foreground">
                  2
                </span>
                <span className="flex flex-wrap items-center gap-1">
                  Tap the Share button <Share className="h-4 w-4" /> at the bottom of the screen.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-foreground">
                  3
                </span>
                <span className="flex flex-wrap items-center gap-1">
                  Choose Add to Home Screen <Plus className="h-4 w-4" />, then tap Add.
                </span>
              </li>
            </ol>
          ) : (
            <ol className="space-y-4 text-sm text-foreground">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-foreground">
                  1
                </span>
                <span>Open collaborate8.com in Chrome on your Android phone.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-foreground">
                  2
                </span>
                <span>Tap the three dots menu in the top corner.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-foreground">
                  3
                </span>
                <span>Choose Install app or Add to Home screen.</span>
              </li>
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InstallAppButtons;
