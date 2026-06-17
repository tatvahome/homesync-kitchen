import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Camera, Zap } from "lucide-react";
import { BottomSheet } from "@/components/homesync/bottom-sheet";
import { Stepper } from "@/components/homesync/stepper";
import { ScanResultCard } from "@/components/homesync/scan-result-card";
import { usePantry } from "@/components/homesync/store";
import { useHaptics } from "@/hooks/use-haptics";
import { MOCK_SCAN_RESULT } from "@/lib/mock-data";

export const Route = createFileRoute("/scan")({
  head: () => ({ meta: [{ title: "Scan — homeSync" }] }),
  component: ScanPage,
});

type Stage = "camera" | "result";

function ScanPage() {
  const [stage, setStage] = useState<Stage>("camera");
  const [editOpen, setEditOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(MOCK_SCAN_RESULT.estimatedPrice);
  const navigate = useNavigate();
  const { add } = usePantry();
  const haptic = useHaptics();

  const handleCapture = () => {
    haptic("light");
    setStage("result");
  };

  const handleConfirm = (name: string) => {
    haptic("success");
    add({
      id: `n${Date.now()}`,
      name,
      emoji: MOCK_SCAN_RESULT.emoji,
      daysLeft: MOCK_SCAN_RESULT.estimatedDays,
      status: "fresh",
      price,
      quantity: qty,
      unit: "pc",
      addedAt: "just now",
    });
    navigate({ to: "/pantry" });
  };

  return (
    <div className="relative min-h-dvh bg-foreground text-background">
      <button
        onClick={() => navigate({ to: "/" })}
        className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-20 flex h-10 w-10 items-center justify-center rounded-full bg-background/15 text-background backdrop-blur"
        aria-label="Back"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {stage === "camera" && (
        <>
          <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
            <div className="relative mb-8 flex h-72 w-72 items-center justify-center">
              <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-background/30" />
              <div className="absolute left-0 top-0 h-10 w-10 rounded-tl-2xl border-l-4 border-t-4 border-secondary" />
              <div className="absolute right-0 top-0 h-10 w-10 rounded-tr-2xl border-r-4 border-t-4 border-secondary" />
              <div className="absolute left-0 bottom-0 h-10 w-10 rounded-bl-2xl border-b-4 border-l-4 border-secondary" />
              <div className="absolute right-0 bottom-0 h-10 w-10 rounded-br-2xl border-b-4 border-r-4 border-secondary" />
              <Camera className="h-16 w-16 text-background/40" />
            </div>
            <p className="font-display text-lg">Point at the item</p>
            <p className="mt-1 max-w-xs text-sm text-background/60">
              homeSync will detect the product, freshness window, and typical price.
            </p>
          </div>
          <div className="fixed inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] z-10 flex justify-center">
            <button
              onClick={handleCapture}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-background ring-4 ring-background/30 active:scale-95"
              aria-label="Capture"
            >
              <span className="h-14 w-14 rounded-full bg-secondary" />
            </button>
          </div>
        </>
      )}

      {stage === "result" && (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-5 text-foreground animate-fade-up">
          <div className="mb-6 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-secondary">
            <Zap className="h-3.5 w-3.5" /> Detected
          </div>
          <div className="w-full max-w-sm">
            <ScanResultCard
              emoji={MOCK_SCAN_RESULT.emoji}
              initialName={MOCK_SCAN_RESULT.detectedName}
              confidence={MOCK_SCAN_RESULT.confidence}
              onConfirm={handleConfirm}
              onEdit={() => setEditOpen(true)}
            />
          </div>
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setStage("camera")}
              className="rounded-xl bg-muted px-4 py-2.5 text-sm font-medium"
            >
              Retake
            </button>
            <button
              onClick={() => handleConfirm(MOCK_SCAN_RESULT.detectedName)}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title="Refine details">
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Quantity</p>
            <Stepper value={qty} onChange={setQty} presets={[1, 2, 6, 12]} />
          </div>
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Price paid (₹)</p>
            <Stepper value={price} onChange={setPrice} step={5} presets={[50, 100, 200, 500]} />
          </div>
          <button
            onClick={() => { setEditOpen(false); handleConfirm(MOCK_SCAN_RESULT.detectedName); }}
            className="w-full rounded-2xl bg-primary py-3 text-sm font-medium text-primary-foreground"
          >
            Add to pantry
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}