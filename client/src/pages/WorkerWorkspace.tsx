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
  Loader2,
  Upload,
  ChevronLeft,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

type Assignment = {
  shiftId: number;
  machineId: number;
  machineCode: string;
  machineName: string;
  location: string | null;
  checked: boolean;
  checkStatus: string | null;
};

export default function WorkerWorkspace() {
  const { user, logout } = useAuth();
  const { data: assignments = [], refetch } =
    trpc.factory.getMyAssignments.useQuery(undefined, {
      refetchInterval: 30_000,
    });

  const [active, setActive] = useState<Assignment | null>(null);
  const [step, setStep] = useState<"list" | "capture">("list");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const uploadProof = trpc.factory.uploadProof.useMutation();
  const submitCheck = trpc.factory.submitMachineCheck.useMutation({
    onSuccess: () => {
      toast.success("Inspection submitted for review!");
      setActive(null);
      setStep("list");
      setNotes("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

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
        notes: notes.trim() || undefined,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "PENDING":
        return <Badge className="bg-amber-500 text-slate-950">Pending Review</Badge>;
      case "COMPLETED":
        return <Badge className="bg-emerald-600">Approved</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-600">Rejected</Badge>;
      default:
        return <Badge className="bg-slate-700">Not Started</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-4 py-4 sticky top-0 bg-slate-950/80 backdrop-blur-sm z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            {step === "capture" && (
              <Button variant="ghost" size="icon" onClick={() => setStep("list")}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="text-lg font-bold">
                {step === "list" ? "My Assignments" : "Submit Proof"}
              </h1>
              <p className="text-xs text-slate-500">{user?.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => logout()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 p-4 pb-24">
        {step === "list" && (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-400">
                Today's tasks — tap to submit proof
              </p>
              <Badge variant="outline" className="border-slate-700 text-slate-500">
                {new Date().toLocaleDateString()}
              </Badge>
            </div>
            
            {assignments.map((a) => (
              <Card
                key={a.shiftId}
                className={`border-slate-800 bg-slate-900 cursor-pointer active:scale-[0.99] transition-transform ${
                  a.checked ? "opacity-75" : "hover:border-amber-500/50"
                }`}
                onClick={() => {
                  if (a.checked && a.checkStatus !== "REJECTED") {
                    toast.info("Already submitted for today");
                    return;
                  }
                  setActive(a);
                  setStep("capture");
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{a.machineName}</CardTitle>
                    {getStatusBadge(a.checkStatus)}
                  </div>
                  <CardDescription className="font-mono text-xs flex items-center gap-2">
                    <span className="bg-slate-800 px-1.5 py-0.5 rounded">{a.machineCode}</span>
                    {a.location && <span>· {a.location}</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-slate-500 flex items-center justify-between">
                  <span>Shift: {a.shiftType}</span>
                  {a.checked && <span className="text-emerald-500">Submitted</span>}
                </CardContent>
              </Card>
            ))}
            
            {assignments.length === 0 && (
              <Card className="border-slate-800 bg-slate-900 border-dashed">
                <CardContent className="py-12 text-center text-slate-500 flex flex-col items-center gap-3">
                  <div className="p-3 bg-slate-800 rounded-full">
                    <FileText className="h-6 w-6 text-slate-600" />
                  </div>
                  <p>No machines assigned for today.</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {step === "capture" && active && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="border-slate-800 bg-slate-900 overflow-hidden">
              <div className="bg-amber-500 h-1 w-full" />
              <CardHeader>
                <CardTitle className="text-lg">{active.machineName}</CardTitle>
                <CardDescription>
                  Provide photo or video evidence of inspection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Inspection Notes (Optional)
                  </label>
                  <Textarea 
                    placeholder="Describe any issues or observations..."
                    className="bg-slate-950 border-slate-800 focus:border-amber-500 min-h-[100px]"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="flex aspect-video flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950 p-6">
                  <Camera className="mb-3 h-12 w-12 text-amber-500" />
                  <p className="text-center text-sm text-slate-400">
                    Upload a clear photo or video showing the machine status
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
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
                      className="w-full h-16 text-lg bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20"
                      disabled={uploading}
                    >
                      <span>
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                            Uploading Proof...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-6 w-6" />
                            Take Photo / Video
                          </>
                        )}
                      </span>
                    </Button>
                  </label>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full text-slate-500" 
                    onClick={() => setStep("list")}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg text-xs text-slate-500">
              <p className="font-semibold mb-1 text-slate-400 uppercase tracking-wider">Instructions:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Ensure the machine code is visible in the proof.</li>
                <li>Capture any specific areas requiring attention.</li>
                <li>Videos should be less than 30 seconds.</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
