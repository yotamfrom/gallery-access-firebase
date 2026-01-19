import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { filemakerApi } from '@/lib/filemaker-api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Navigation } from "@/components/Navigation";
import { Save, Loader2, Eye, EyeOff, RefreshCw } from "lucide-react";

interface ConfigItem {
    key: string;
    value: string;
    description?: string;
    is_secret: boolean;
}

const SettingsPage = () => {
    const { isAuthenticated, currentUser, isAdmin: isAuthContextAdmin } = useAuth();
    const [configs, setConfigs] = useState<ConfigItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [is2FAPromptOpen, setIs2FAPromptOpen] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);
    const [isTesting, setIsTesting] = useState(false);

    // Access Control - Admin only
    const isAdmin = currentUser?.email?.toLowerCase() === 'yotamfr@gmail.com';

    useEffect(() => {
        if (!isAdmin) {
            setIsLoading(false);
            return;
        }

        const loadConfig = async () => {
            setIsLoading(true);
            try {
                const data = await filemakerApi.getSystemConfigs();
                setConfigs(data || []);
            } catch (err: any) {
                console.error('Error loading config:', err);
                toast.error('Failed to load settings');
            } finally {
                setIsLoading(false);
            }
        };

        loadConfig();
    }, [isAdmin]);

    const fetchConfigs = async () => {
        setIsLoading(true);
        try {
            const data = await filemakerApi.getSystemConfigs();
            setConfigs(data || []);
        } catch (err: any) {
            console.error('Error loading config:', err);
            toast.error('Failed to load settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateValue = (key: string, value: string) => {
        setConfigs(prev => prev.map(item =>
            item.key === key ? { ...item, value } : item
        ));
    };

    const toggleSecret = (key: string) => {
        setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!twoFactorCode && !is2FAPromptOpen) {
            setIs2FAPromptOpen(true);
            return;
        }

        if (!twoFactorCode || twoFactorCode.length !== 6) {
            toast.error('Please enter a valid 6-digit 2FA code');
            return;
        }

        setIsSaving(true);
        try {
            await filemakerApi.updateSystemConfigs(configs, twoFactorCode, currentUser?.email || undefined);

            toast.success('Configuration saved successfully');
            setIs2FAPromptOpen(false);
            setTwoFactorCode('');
            // Reload to get redacted values back for safety
            fetchConfigs();
        } catch (err: any) {
            console.error('Error saving config:', err);
            toast.error(err.message || 'Failed to save configuration');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const result = await filemakerApi.testConnection();
            setTestResult(result);
            if (result.status === 'success') {
                toast.success('Connection successful');
            } else {
                toast.error(`Connection failed: ${result.message}`);
                // If it failed, also try diagnostics for more info
                try {
                    const diag = await filemakerApi.diagnostics();
                    setTestResult((prev: any) => ({ ...prev, diagnostics: diag }));
                } catch (diagErr) {
                    console.error('Diagnostics failed:', diagErr);
                }
            }
        } catch (err: any) {
            console.error('Error testing connection:', err);
            const errorMessage = err.message || 'Unknown error occurred';
            toast.error(`Connection failed: ${errorMessage}`);
            setTestResult({
                status: 'error',
                message: errorMessage
            });
        } finally {
            setIsTesting(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="container mx-auto py-12 px-6 flex flex-col items-center justify-center text-center">
                <div className="bg-destructive/10 p-4 rounded-full mb-4">
                    <span className="text-4xl">🚫</span>
                </div>
                <h1 className="text-2xl font-bold mb-2">Access Restrictred</h1>
                <p className="text-muted-foreground max-w-md">
                    You do not have permission to view this page. This area is restricted to system administrators only.
                </p>
                <Button variant="outline" className="mt-6" onClick={() => window.location.href = '/'}>
                    Return to Dashboard
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-secondary">
            <Navigation />
            <main className="max-w-4xl mx-auto p-6 pt-12">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
                        <p className="text-muted-foreground mt-1 text-sm uppercase tracking-widest font-light">
                            Manage API credentials and environment variables
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchConfigs}
                            disabled={isLoading}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Reload
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving || isLoading}
                            className="bg-black text-white hover:bg-zinc-800"
                        >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Changes
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
                        <p className="text-zinc-400 text-sm font-light uppercase tracking-widest">Fetching configuration...</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        <Card className="rounded-none border-zinc-100 shadow-none">
                            <CardHeader>
                                <CardTitle className="text-lg font-medium">FileMaker API Configuration</CardTitle>
                                <CardDescription>
                                    These settings control the connection to your FileMaker Data API.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {configs.map((config) => (
                                    <div key={config.key} className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor={config.key} className="text-[11px] uppercase tracking-widest font-medium text-zinc-500">
                                                {config.key.replace(/_/g, ' ')}
                                            </Label>
                                            {config.is_secret && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => toggleSecret(config.key)}
                                                >
                                                    {showSecrets[config.key] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                </Button>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <Input
                                                id={config.key}
                                                type={config.is_secret && !showSecrets[config.key] ? "password" : "text"}
                                                value={config.value}
                                                onChange={(e) => handleUpdateValue(config.key, e.target.value)}
                                                className="rounded-none border-zinc-100 focus-visible:ring-black font-mono text-sm"
                                                placeholder={`Enter ${config.key.toLowerCase()}...`}
                                            />
                                        </div>
                                        {config.description && (
                                            <p className="text-[10px] text-zinc-400 italic">
                                                {config.description}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Connection Debug Section */}
                        <Card className="rounded-none border-zinc-100 shadow-none">
                            <CardHeader>
                                <CardTitle className="text-lg font-medium">Connection Diagnostics</CardTitle>
                                <CardDescription>
                                    Test the connection to FileMaker Cloud and identify where it might be lost.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <Button
                                        variant="outline"
                                        onClick={handleTestConnection}
                                        disabled={isTesting}
                                        className="rounded-none border-zinc-200"
                                    >
                                        {isTesting ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                        )}
                                        Run Connection Test
                                    </Button>
                                    {testResult && (
                                        <div className={`text-sm font-medium flex items-center gap-2 ${testResult.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                            {testResult.status === 'success' ? '✓' : '✗'} {testResult.status === 'success' ? 'Connected' : 'Failed'}
                                        </div>
                                    )}
                                </div>

                                {testResult && (
                                    <div className="bg-zinc-50 p-4 font-mono text-xs space-y-2 border border-zinc-100 overflow-auto max-h-[400px]">
                                        <div className="flex justify-between border-b border-zinc-200 pb-2 mb-2">
                                            <span className="font-bold uppercase">Test Parameter</span>
                                            <span className="font-bold uppercase">Value</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Status:</span>
                                            <span className={testResult.status === 'success' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                                                {testResult.status?.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Message:</span>
                                            <span className="text-right ml-4">{testResult.message}</span>
                                        </div>
                                        {testResult.responseTime && (
                                            <div className="flex justify-between">
                                                <span>Response Time:</span>
                                                <span>{testResult.responseTime}ms</span>
                                            </div>
                                        )}
                                        {testResult.version && (
                                            <div className="flex justify-between">
                                                <span>Edge Version:</span>
                                                <span>{testResult.version}</span>
                                            </div>
                                        )}

                                        {testResult.logs && testResult.logs.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-zinc-200">
                                                <p className="font-bold mb-2 uppercase">Technical Logs:</p>
                                                <div className="bg-zinc-50 p-3 rounded border border-zinc-200 text-xs font-mono space-y-1 overflow-auto max-h-60">
                                                    {testResult.logs.map((log: string, i: number) => (
                                                        <div key={i} className="whitespace-pre-wrap">{log}</div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {testResult.diagnostics && (
                                            <div className="mt-4 pt-4 border-t border-zinc-200">
                                                <p className="font-bold mb-2 uppercase">Deep Diagnostics:</p>
                                                <pre className="whitespace-pre-wrap break-all text-xs font-mono bg-zinc-50 p-3 rounded border border-zinc-200">
                                                    {JSON.stringify(testResult.diagnostics, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* 2FA Verification Dialog (Minimalist Overlay) */}
                {is2FAPromptOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="bg-white p-8 max-w-sm w-full shadow-2xl space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-xl font-medium">Verify Identity</h3>
                                <p className="text-zinc-500 text-sm">
                                    Please enter your 2FA code to save changes.
                                </p>
                            </div>

                            <form onSubmit={handleSave} className="space-y-6">
                                <Input
                                    autoFocus
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    placeholder="000 000"
                                    value={twoFactorCode}
                                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="text-center text-2xl tracking-[0.5em] h-14 font-mono rounded-none border-zinc-200"
                                />

                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1 rounded-none border-zinc-200"
                                        onClick={() => {
                                            setIs2FAPromptOpen(false);
                                            setTwoFactorCode('');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1 rounded-none bg-black text-white hover:bg-zinc-800"
                                        disabled={isSaving}
                                    >
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default SettingsPage;
