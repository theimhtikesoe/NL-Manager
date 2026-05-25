import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { fileToBase64 } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Camera,
  LogOut,
  QrCode,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

type Assignment = {
  shiftId: number;
  machineId: number;
  machineCode: string;
  machineName: string;
  location: string | null;
  checked: boolean;
};

export default function WorkerWorkspace() {
  const { user, logout } = useAuth();
  const { data: assignments = [], refetch } =
    trpc.factory.getMyAssignments.useQuery(undefined, {
      refetchInterval: 30_000,
    });

  const [active, setActive] = useState<Assignment | null>(null);
  const [step, setStep] = useState<"list" | "scan" | "capture">("list");
  const [scanned, setScanned] = useState(false);

  const uploadProof = trpc.factory.uploadProof.useMutation();
  const submitCheck = trpc.factory.submitMachineCheck.useMutation({
    onSuccess: () => {
      toast.success("Inspection submitted!");
      setActive(null);
      setStep("list");
      setScanned(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!active) return;
    setUploading(true);
    try {
      const dataBase64 = await fileToBase64(file);
      const { mediaUrl } = await uploadProof.mutateAsync({
        dataBase64,
        contentType: file.type || "application/octet-stream",
        fileName: file.name,
      });
      await submitCheck.mutateAsync({
        shiftId: active.shiftId,
        machineId: active.machineId,
        mediaUrl,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">My Machines</h1>
            <p className="text-xs text-slate-500">{user?.name}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => logout()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 p-4 pb-24">
        {step === "list" && (
          <>
            <p className="text-sm text-slate-400">
              Today&apos;s assigned machines — tap to start inspection
            </p>
            {assignments.map((a) => (
              <Card
                key={a.shiftId}
                className="border-slate-800 bg-slate-900 cursor-pointer active:scale-[0.99] transition-transform"
                onClick={() => {
                  if (a.checked) {
                    toast.info("Already checked today");
                    return;
                  }
                  setActive(a);
                  setStep("scan");
                  setScanned(false);
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{a.machineName}</CardTitle>
                    <Badge
                      className={
                        a.checked
                          ? "bg-emerald-600"
                          : "bg-amber-600 text-slate-950"
                      }
                    >
                      {a.checked ? "Done" : "Pending"}
                    </Badge>
                  </div>
                  <CardDescription className="font-mono text-xs">
                    {a.machineCode}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-slate-500">
                  {a.location || "No location"} · {a.shiftType}
                </CardContent>
              </Card>
            ))}
            {assignments.length === 0 && (
              <Card className="border-slate-800 bg-slate-900">
                <CardContent className="py-8 text-center text-slate-500">
                  No machines assigned for today.
                </CardContent>
              </Card>
            )}
          </>
        )}

        {step === "scan" && active && (
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader>
              <CardTitle className="text-base">{active.machineName}</CardTitle>
              <CardDescription>Step 2: Scan machine QR code</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950">
                <QrCode className="mb-3 h-16 w-16 text-slate-600" />
                <p className="text-center text-sm text-slate-500 px-4">
                  QR scanner placeholder — tap below when at machine
                </p>
              </div>
              <Button
                className="w-full h-12 bg-amber-500 text-slate-950 hover:bg-amber-400"
                onClick={() => {
                  setScanned(true);
                  setStep("capture");
                }}
              >
                <QrCode className="mr-2 h-5 w-5" />
                Simulated Scan OK
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep("list")}>
                Cancel
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "capture" && active && scanned && (
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader>
              <CardTitle className="text-base">Photo / Video Proof</CardTitle>
              <CardDescription>
                Capture proof that {active.machineName} was inspected
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex aspect-video flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-950">
                <Camera className="mb-2 h-12 w-12 text-amber-400" />
                <p className="text-center text-sm text-slate-400 px-4">
                  Take a photo or video of the machine after inspection
                </p>
              </div>

              <label className="block">
                <input
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                  }}
                />
                <Button
                  asChild
                  className="w-full h-14 bg-emerald-600 hover:bg-emerald-500"
                  disabled={uploading}
                >
                  <span>
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-5 w-5" />
                        Upload & Finish
                      </>
                    )}
                  </span>
                </Button>
              </label>

              <Button variant="ghost" className="w-full" onClick={() => setStep("scan")}>
                Back
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
