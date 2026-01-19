import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bug, RefreshCcw, ShieldAlert } from 'lucide-react';
import { filemakerApi } from '@/lib/filemaker-api';
import { toast } from 'sonner';

export function DebugPanel() {
    const { session, currentUser, isAdmin: authIsAdmin } = useAuth();
    const [diagnostics, setDiagnostics] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const runDiagnostics = async () => {
        setIsLoading(true);
        try {
            const results = await filemakerApi.diagnostics();
            setDiagnostics(results);
            toast.success('Diagnostics complete');
        } catch (error: any) {
            console.error('Diagnostics failed:', error);
            toast.error('Diagnostics failed: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <Button
                variant="outline"
                size="sm"
                className="fixed bottom-4 right-4 z-50 shadow-lg bg-background/80 backdrop-blur-sm border-orange-500/50 hover:bg-orange-500/10 text-orange-600 dark:text-orange-400"
                onClick={() => setIsOpen(true)}
            >
                <Bug className="w-4 h-4 mr-2" />
                Debug Tool
            </Button>
        );
    }

    return (
        <Card className="fixed bottom-4 right-4 z-50 w-96 shadow-2xl border-orange-500/50 overflow-hidden bg-background/95 backdrop-blur-md">
            <CardHeader className="bg-orange-500/10 border-b border-orange-500/20 py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center text-orange-600 dark:text-orange-400">
                    <Bug className="w-4 h-4 mr-2" />
                    System Diagnostics
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsOpen(false)}>×</Button>
            </CardHeader>
            <CardContent className="p-4 space-y-4 max-h-[70vh] overflow-auto">
                {/* Session Info */}
                <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Session Status</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-secondary/50 p-2 rounded">
                            <p className="text-muted-foreground">Gallery ID</p>
                            <p className="font-mono font-bold truncate">{session?.galleryId || 'NOT SET'}</p>
                        </div>
                        <div className="bg-secondary/50 p-2 rounded">
                            <p className="text-muted-foreground">Is Admin</p>
                            <p className="font-mono font-bold">{authIsAdmin ? 'YES' : 'NO'}</p>
                        </div>
                        <div className="bg-secondary/50 p-2 rounded col-span-2">
                            <p className="text-muted-foreground">Gallery Name</p>
                            <p className="font-bold truncate">{session?.galleryName || 'None'}</p>
                        </div>
                    </div>
                </div>

                {/* User Info */}
                <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">User Identity</h4>
                    <div className="bg-secondary/50 p-2 rounded text-xs space-y-1">
                        <p className="truncate"><span className="text-muted-foreground">Email:</span> {currentUser?.email || 'Anonymous'}</p>
                        <p className="truncate"><span className="text-muted-foreground">Meta ID:</span> {currentUser?.user_metadata?.gallery_id || 'Missing'}</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="pt-2">
                    <Button
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-500/20"
                        onClick={runDiagnostics}
                        disabled={isLoading}
                    >
                        {isLoading ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
                        Run Deep Backend Check
                    </Button>
                </div>

                {/* Diagnostic Results */}
                {diagnostics && (
                    <div className="mt-4 space-y-3 pt-3 border-t">
                        <div className="bg-black/90 p-3 rounded-md overflow-x-auto">
                            <p className="text-[10px] text-orange-400 font-mono mb-2">Backend Identity Results:</p>
                            <pre className="text-[11px] text-green-400 font-mono whitespace-pre-wrap">
                                {JSON.stringify(diagnostics.session || {}, null, 2)}
                            </pre>
                        </div>

                        {diagnostics.flight_logs && diagnostics.flight_logs.length > 0 && (
                            <div className="bg-black/90 p-3 rounded-md max-h-40 overflow-y-auto border border-orange-500/30">
                                <p className="text-[10px] text-orange-400 font-mono mb-2">Backend Logs:</p>
                                <div className="space-y-1">
                                    {diagnostics.flight_logs.map((log: string, idx: number) => (
                                        <p key={idx} className="text-[10px] text-gray-300 font-mono leading-tight">{log}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
