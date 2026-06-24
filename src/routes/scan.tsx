import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { BottomSheet } from "@/components/homesync/bottom-sheet";
import { ReceiptReview } from "@/components/homesync/receipt-review";
import { useHaptics } from "@/hooks/use-haptics";
import { useOnline } from "@/hooks/use-online";
import { addItemFromScan, bulkAddItems } from "@/lib/db";
import {
  GeminiError,
  GEMINI_API_KEY,
  scanReceipt,
  scanSingleItem,
  type ReceiptResult,
  type SingleItemResult,
} from "@/lib/gemini";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/scan")({
  head: () => ({ meta: [{ title: "Scan — homeSync" }] }),
  component: ScanPage,
});

type Mode = "single" | "receipt";
type Stage = "camera" | "analyzing" | "single-result" | "receipt-result";
type CameraState = "idle" | "starting" | "live" | "denied" | "unavailable";

interface ErrorState {
  title: string;
  message: string;
  retry?: () => void;
  showKeyLink?: boolean;
}

function ScanPage() {
  const navigate = useNavigate();
  const haptic = useHaptics();
  const apiKey = GEMINI_API_KEY;
  const online = useOnline();

  const [mode, setMode] = useState<Mode>("single");
  const [stage, setStage] = useState<Stage>("camera");
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [error, setError] = useState<ErrorState | null>(null);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [singleResult, setSingleResult] = useState<SingleItemResult | null>(null);
  const [receiptResult, setReceiptResult] = useState<ReceiptResult | null>(null);

  // Editable form state for the post-scan single-item review
  const [formName, setFormName] = useState("");
  const [formQty, setFormQty] = useState("1");
  const [formUnit, setFormUnit] = useState("pc");
  const [formPrice, setFormPrice] = useState("");
  const [formDays, setFormDays] = useState("7");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (stage === "camera") startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  async function startCamera() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraState("unavailable");
      return;
    }
    setCameraState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraState("live");
    } catch (e) {
      const name = (e as DOMException)?.name;
      setCameraState(name === "NotAllowedError" ? "denied" : "unavailable");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  function captureFrame(): string | null {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;
    const maxW = 1280;
    const scale = Math.min(1, maxW / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  }

  const [capturing, setCapturing] = useState(false);
  const [captureDone, setCaptureDone] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  async function handleCapture() {
    if (capturing) return; // double-tap guard
    haptic("light");
    if (!online) {
      setError({
        title: "You're offline",
        message: "Scanning needs a network connection. Your pantry still works offline.",
      });
      return;
    }
    setCapturing(true);
    const img = captureFrame();
    if (!img) {
      setCapturing(false);
      setError({ title: "Couldn't capture", message: "Camera frame wasn't ready. Try again.", retry: handleCapture });
      return;
    }
    setCapturedImage(img);
    stopCamera();
    try {
      if (mode === "single") {
        const result = await scanSingleItem(apiKey, img);
        setSingleResult(result);
        setFormName(result.name);
        setFormQty(String(result.suggestedQuantity ?? 1));
        setFormUnit(result.suggestedUnit || "pc");
        setFormPrice("");
        setFormDays(String(result.estimatedShelfDays ?? 7));
        setCaptureDone(true);
        setStage("single-result");
        haptic("success");
      } else {
        setStage("analyzing"); // show receipt skeleton
        const result = await scanReceipt(apiKey, img);
        setReceiptResult(result);
        setCaptureDone(true);
        setStage("receipt-result");
        haptic("success");
      }
    } catch (e) {
      haptic("error");
      handleScanError(e);
    } finally {
      setCapturing(false);
      setTimeout(() => setCaptureDone(false), 600);
    }
  }

  function handleScanError(e: unknown) {
    const retake = () => { setError(null); setStage("camera"); };
    if (e instanceof GeminiError) {
      const map: Record<GeminiError["kind"], ErrorState> = {
        "no-key": { title: "No Gemini key", message: "Add your key in Settings to enable scanning.", showKeyLink: true },
        "auth": { title: "API key rejected", message: "Gemini didn't accept this key. Check it in Settings.", showKeyLink: true },
        "rate": { title: "Slow down a sec", message: "You've hit Gemini's rate limit. Try again in a moment.", retry: retake },
        "network": { title: "Couldn't reach Gemini", message: "Check your connection and try again.", retry: retake },
        "no-detection": {
          title: mode === "single" ? "Nothing recognized" : "Couldn't read this receipt",
          message: mode === "single"
            ? "Try framing the product more clearly and capture again."
            : "Make sure the whole receipt is in frame and well-lit.",
          retry: retake,
        },
        "bad-response": { title: "Unexpected response", message: "Gemini sent something we couldn't parse. Try again.", retry: retake },
      };
      setError(map[e.kind]);
    } else {
      setError({ title: "Something went wrong", message: (e as Error)?.message ?? "Unknown error", retry: retake });
    }
  }

  async function confirmSingle(name: string) {
    if (!singleResult || !capturedImage) return;
    if (savingItem) return;
    setSavingItem(true);
    const qtyNum = Number(formQty) || 1;
    const priceNum = Number(formPrice) || 0;
    const daysNum = Number(formDays) || 7;
    haptic("success");
    await addItemFromScan({
      name,
      emoji: singleResult.emoji,
      thumbnail: capturedImage,
      quantity: qtyNum,
      unit: formUnit,
      price: priceNum,
      estimatedDays: daysNum,
      category: singleResult.category,
    });
    navigate({ to: "/pantry" });
  }

  async function confirmReceipt(selected: ReceiptResult["items"]) {
    await bulkAddItems(
      selected.map(s => ({
        name: s.name,
        quantity: s.quantity,
        unit: s.unit,
        price: s.price,
        estimatedDays: 7,
        emoji: "🛒",
      })),
      "receipt scan",
    );
    haptic("success");
    navigate({ to: "/pantry" });
  }

  // -- render --

  return (
    <div className="relative min-h-dvh overflow-hidden bg-foreground text-background">
      <button
        onClick={() => navigate({ to: "/" })}
        className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-30 flex h-10 w-10 items-center justify-center rounded-full bg-background/15 text-background backdrop-blur"
        aria-label="Back"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* Mode toggle */}
      {stage === "camera" && (
        <div className="absolute inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-20 flex justify-center">
          <div className="flex rounded-full bg-background/15 p-1 text-xs font-medium backdrop-blur">
            {(["single", "receipt"] as const).map(m => (
              <button
                key={m}
                onClick={() => { haptic("selection"); setMode(m); }}
                className={cn(
                  "rounded-full px-4 py-1.5 transition",
                  mode === m ? "bg-background text-foreground" : "text-background/80",
                )}
              >
                {m === "single" ? "Single Item" : "Receipt"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Camera stage */}
      {stage === "camera" && (
        <>
          <video
            ref={videoRef}
            playsInline
            muted
            className={cn(
              "absolute inset-0 h-full w-full object-cover",
              cameraState !== "live" && "opacity-0",
            )}
          />
          {cameraState !== "live" && (
            <div className="relative z-10 flex min-h-dvh items-center justify-center px-8 text-center">
              {cameraState === "starting" && (
                <div className="flex flex-col items-center gap-3 text-background/80">
                  <Loader2 className="h-7 w-7 animate-spin" />
                  <p className="text-sm">Starting camera…</p>
                </div>
              )}
              {cameraState === "denied" && (
                <CameraGate
                  title="Camera blocked"
                  message="homeSync needs camera access to scan items. Allow it in your browser permissions, then try again."
                  onRetry={startCamera}
                />
              )}
              {cameraState === "unavailable" && (
                <CameraGate
                  title="No camera available"
                  message="We couldn't open a camera on this device. Try opening homeSync on your phone."
                  onRetry={startCamera}
                />
              )}
            </div>
          )}

          {cameraState === "live" && (
            <>
              {/* Viewfinder overlay */}
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div
                  className={cn(
                    "relative",
                    mode === "single" ? "h-72 w-72" : "h-[26rem] w-72",
                  )}
                >
                  <div className="absolute left-0 top-0 h-10 w-10 rounded-tl-2xl border-l-4 border-t-4 border-secondary" />
                  <div className="absolute right-0 top-0 h-10 w-10 rounded-tr-2xl border-r-4 border-t-4 border-secondary" />
                  <div className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-2xl border-b-4 border-l-4 border-secondary" />
                  <div className="absolute bottom-0 right-0 h-10 w-10 rounded-br-2xl border-b-4 border-r-4 border-secondary" />
                </div>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-44 z-10 text-center">
                <p className="text-sm font-medium text-background drop-shadow">
                  {mode === "single" ? "Frame the item" : "Frame the whole receipt"}
                </p>
              </div>
              <div className="fixed inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] z-20 flex justify-center">
                <button
                  onClick={handleCapture}
                  disabled={capturing}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-background ring-4 ring-background/30 transition active:scale-95 disabled:active:scale-100"
                  aria-label="Capture"
                >
                  {capturing ? (
                    <Loader2 className="h-8 w-8 animate-spin text-secondary" />
                  ) : captureDone ? (
                    <Check className="h-8 w-8 text-secondary" />
                  ) : (
                    <span className="h-14 w-14 rounded-full bg-secondary" />
                  )}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* Analyzing */}
      {stage === "analyzing" && (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background text-foreground">
          {capturedImage && (
            <img src={capturedImage} alt="captured" className="h-40 w-40 rounded-2xl object-cover opacity-70" />
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{mode === "single" ? "Identifying item…" : "Reading receipt…"}</span>
          </div>
        </div>
      )}

      {/* Single item result */}
      {stage === "single-result" && singleResult && (
        <div className="min-h-dvh bg-background px-5 pb-10 pt-16 text-foreground animate-fade-up">
          <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-secondary">
            <Sparkles className="h-3.5 w-3.5" /> Detected · {Math.round(singleResult.confidence * 100)}%
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted text-5xl">
              {singleResult.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <label className="text-xs text-muted-foreground">Item name</label>
              <input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="w-full border-b border-border bg-transparent pb-1 text-lg font-semibold outline-none focus:border-secondary"
              />
              {singleResult.brand && (
                <p className="mt-1 text-xs text-muted-foreground">Brand: {singleResult.brand}</p>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-xs text-muted-foreground">Unit</label>
              <div className="flex flex-wrap gap-2">
                {["pc", "kg", "g", "L", "ml", "bunch", "pack"].map(u => (
                  <button
                    key={u}
                    onClick={() => { haptic("selection"); setFormUnit(u); }}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                      formUnit === u
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">
                  Quantity ({formUnit})
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={formQty}
                  onChange={e => setFormQty(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base tabular-nums outline-none focus:border-secondary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">Price (₹)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={formPrice}
                  onChange={e => setFormPrice(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base tabular-nums outline-none focus:border-secondary"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">
                Expires in (days) · AI suggested {singleResult.estimatedShelfDays}
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={formDays}
                onChange={e => setFormDays(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base tabular-nums outline-none focus:border-secondary"
              />
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setStage("camera")}
              className="flex items-center gap-1.5 rounded-xl bg-muted px-4 py-2.5 text-sm font-medium"
            >
              <RefreshCw className="h-4 w-4" /> Retake
            </button>
            <button
              onClick={() => confirmSingle(formName)}
              className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Add to pantry
            </button>
          </div>
        </div>
      )}

      {/* Receipt result */}
      {stage === "receipt-result" && receiptResult && (
        <div className="min-h-dvh bg-background px-5 pb-10 pt-16 text-foreground animate-fade-up">
          <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-secondary">
            <Sparkles className="h-3.5 w-3.5" /> Receipt extracted
          </div>
          <h2 className="mb-4 font-display text-2xl font-semibold">Review items</h2>
          <ReceiptReview
            currency={receiptResult.currency}
            items={receiptResult.items}
            onConfirm={confirmReceipt}
          />
          <button
            onClick={() => setStage("camera")}
            className="mt-4 w-full rounded-xl bg-muted py-2.5 text-sm font-medium"
          >
            Retake photo
          </button>
        </div>
      )}

      {/* Error sheet */}
      <BottomSheet open={!!error} onClose={() => setError(null)} title={error?.title}>
        {error && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <div className="flex flex-col gap-2">
              {error.showKeyLink && (
                <Link
                  to="/settings"
                  onClick={() => setError(null)}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-secondary py-3 text-sm font-medium text-secondary-foreground"
                >
                  Open Settings
                </Link>
              )}
              {error.retry && (
                <button
                  onClick={() => { error.retry?.(); setError(null); }}
                  className="rounded-2xl bg-primary py-3 text-sm font-medium text-primary-foreground"
                >
                  Try again
                </button>
              )}
              <button
                onClick={() => setError(null)}
                className="rounded-2xl bg-muted py-3 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function CameraGate({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <div className="max-w-xs">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-background/15">
        <Camera className="h-6 w-6 text-background" />
      </div>
      <h2 className="font-display text-xl font-semibold text-background">{title}</h2>
      <p className="mt-2 text-sm text-background/70">{message}</p>
      <button
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-background px-4 py-2.5 text-sm font-medium text-foreground"
      >
        <RefreshCw className="h-4 w-4" /> Try again
      </button>
    </div>
  );
}