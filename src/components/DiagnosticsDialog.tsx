import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { filemakerApi } from '@/lib/filemaker-api';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Terminal, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface DiagnosticsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    testUrl?: string | null;
}

export function DiagnosticsDialog({ open, onOpenChange, testUrl }: DiagnosticsDialogProps) {
    const [isRunning, setIsRunning] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isRepairing, setIsRepairing] = useState(false);
    const [isFixingCors, setIsFixingCors] = useState(false);
    const [isTestingCors, setIsTestingCors] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [syncResult, setSyncResult] = useState<any>(null);
    const { session } = useAuth();

    const runDiagnostics = async () => {
        setIsRunning(true);
        setResult(null);
        setSyncResult(null);
        try {
            const data = await filemakerApi.diagnostics();
            setResult(data);
        } catch (error: any) {
            setResult({
                success: false,
                error: error.message,
                logs: ["Critical failure calling diagnostics endpoint"]
            });
        } finally {
            setIsRunning(false);
        }
    };

    const handleSyncGalleries = async () => {
        setIsSyncing(true);
        setSyncResult(null);
        try {
            const data = await filemakerApi.syncGalleries();
            setSyncResult(data);
        } catch (error: any) {
            setSyncResult({
                success: false,
                error: error.message
            });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleRepairIdentity = async () => {
        if (!session?.gallery_id) {
            toast.error("No active gallery session found");
            return;
        }
        setIsRepairing(true);
        try {
            const data = await filemakerApi.forceRepairIdentity(session.gallery_id, session.galleryName);
            if (data.success) {
                toast.success("Identity linked successfully to " + session.galleryName);
            } else {
                toast.error(data.error || "Failed to repair identity");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsRepairing(false);
        }
    };

    const handleFixCors = async () => {
        setIsFixingCors(true);
        try {
            const data = await (filemakerApi as any).fixStorageCors();
            if (data.success) {
                toast.success("Storage CORS configured successfully!");
            } else {
                toast.error(data.error || "Failed to fix CORS");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsFixingCors(false);
        }
    };

    const handleTestCors = async () => {
        setIsTestingCors(true);
        const actualTestUrl = testUrl || "https://firebasestorage.googleapis.com/v0/b/gallery-access-firebase.firebasestorage.app/o/sculpters%2Flarge%2F2023_the_climb_3.jpg?alt=media&token=e9e6f8a4-0b7c-4712-8700-1c1f6a1e5828";

        try {
            console.log("[Diagnostics] Testing CORS on:", actualTestUrl);
            const res = await fetch(`${actualTestUrl}${actualTestUrl.includes('?') ? '&' : '?'}cors_test=${Date.now()}`, {
                mode: 'cors',
                cache: 'no-cache'
            });
            if (res.ok) {
                toast.success("CORS Check PASSED! Server allowed the browser to read the image data.");
            } else {
                toast.error(`CORS Check FAILED: Server responded with status ${res.status}. This usually means the image URL is expired or incorrect, but at least the connection was made.`);
            }
        } catch (err: any) {
            toast.error("CORS Check CRASHED: The browser blocked the request entirely. This confirms a CORS block is active.");
            console.error("CORS Test error:", err);
        } finally {
            setIsTestingCors(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Terminal className="w-5 h-5" />
                        System Diagnostics
                    </DialogTitle>
                    <DialogDescription>
                        Troubleshoot the connection between Firebase and FileMaker.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
                    {!result && !isRunning ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg">
                            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium">Ready to test</h3>
                            <p className="text-sm text-muted-foreground mb-6">
                                This will check environment variables, database connectivity, and authentication.
                            </p>
                            <Button onClick={runDiagnostics}>Run Connection Test</Button>
                        </div>
                    ) : isRunning ? (
                        <div className="text-center py-12">
                            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                            <h3 className="text-lg font-medium">Testing Connection...</h3>
                            <p className="text-sm text-muted-foreground">Communicating with Firebase Cloud Functions</p>
                        </div>
                    ) : (
                        <ScrollArea className="flex-1 rounded-md border bg-slate-950 p-4 font-mono text-sm">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    {result.success ? (
                                        <CheckCircle2 className="text-green-500 w-5 h-5" />
                                    ) : (
                                        <XCircle className="text-red-500 w-5 h-5" />
                                    )}
                                    <span className={result.success ? "text-green-400" : "text-red-400"}>
                                        Overall Status: {result.success ? "SUCCESS" : "FAILED"}
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-slate-400 underline mb-2">Detailed Logs:</p>
                                    {result.logs?.map((log: string, i: number) => (
                                        <div key={i} className="text-slate-300 flex items-start gap-2">
                                            <span className="text-slate-600">[{i}]</span>
                                            <span>{log}</span>
                                        </div>
                                    ))}
                                    {result.error && (
                                        <div className="mt-4 p-3 bg-red-900/30 border border-red-900 rounded text-red-200">
                                            <strong>Error:</strong> {result.error}
                                        </div>
                                    )}
                                    {result.diagnostics && (
                                        <div className="mt-4 space-y-2">
                                            <p className="text-slate-400 underline">Configuration Audit:</p>
                                            <pre className="p-2 bg-slate-900 rounded overflow-x-auto text-xs text-blue-300">
                                                {JSON.stringify(result.diagnostics, null, 2)}
                                            </pre>
                                        </div>
                                    )}

                                    {syncResult && (
                                        <div className={`mt-4 p-3 rounded border font-sans ${syncResult.success ? "bg-green-900/20 border-green-900 text-green-200" : "bg-red-900/30 border-red-900 text-red-200"}`}>
                                            <h4 className="font-bold flex items-center gap-2 mb-1">
                                                {syncResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                                Sync Galleries Result
                                            </h4>
                                            {syncResult.success ? (
                                                <p className="text-sm">Successfully synced {syncResult.count} galleries to Firestore.</p>
                                            ) : (
                                                <p className="text-sm">Failed to sync: {syncResult.error}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ScrollArea>
                    )}
                </div>

                <div className="mt-auto pt-4 border-t flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2">
                        {result && !isRunning && (
                            <Button variant="outline" size="sm" onClick={runDiagnostics}>Re-run Test</Button>
                        )}
                        {result?.success && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSyncGalleries}
                                disabled={isSyncing}
                                className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                            >
                                {isSyncing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Syncing...
                                    </>
                                ) : (
                                    "Sync Galleries to Firestore"
                                )}
                            </Button>
                        )}
                        {session?.gallery_id && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRepairIdentity}
                                disabled={isRepairing}
                                className="border-orange-500 text-orange-400 hover:bg-orange-500/10"
                            >
                                {isRepairing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Repairing...
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-4 h-4 mr-2" />
                                        Repair My Identity
                                    </>
                                )}
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleFixCors}
                            disabled={isFixingCors}
                            className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
                        >
                            {isFixingCors ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Fixing CORS...
                                </>
                            ) : (
                                "Fix Storage CORS"
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleTestCors}
                            disabled={isTestingCors}
                            className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                        >
                            {isTestingCors ? "Testing..." : "Test CORS Fetch"}
                        </Button>
                    </div>
                    <div className="flex justify-end">
                        <Button variant="secondary" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
