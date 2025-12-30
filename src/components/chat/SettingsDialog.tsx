'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
    getSettings, 
    saveSettings, 
    clearAllData,
    type AppSettings 
} from '@/lib/chatStorage';
import { MODELS, type ModelKey } from '@/lib/openrouter';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface SettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
    const [settings, setSettings] = useState<AppSettings>(getSettings());
    
    useEffect(() => {
        if (open) {
            setSettings(getSettings());
        }
    }, [open]);

    const handleSave = () => {
        saveSettings(settings);
        toast.success('Settings saved');
        onOpenChange(false);
    };

    const handleClearData = () => {
        if (confirm('Are you sure you want to delete all chats and settings? This cannot be undone.')) {
            clearAllData();
            toast.success('All data cleared');
            window.location.reload();
        }
    };

    const modelOptions = Object.entries(MODELS).map(([key, model]) => ({
        value: key,
        label: `${model.icon} ${model.name}`
    }));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Customize your Unpayd experience
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                    {/* Default Model */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">
                            Default Model
                        </label>
                        <select
                            value={settings.defaultModel}
                            onChange={(e) => setSettings(s => ({ ...s, defaultModel: e.target.value }))}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {modelOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Font Size */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">
                            Font Size
                        </label>
                        <div className="flex gap-2">
                            {(['small', 'medium', 'large'] as const).map(size => (
                                <Button
                                    key={size}
                                    variant={settings.fontSize === size ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setSettings(s => ({ ...s, fontSize: size }))}
                                    className={settings.fontSize === size 
                                        ? 'bg-blue-600 hover:bg-blue-700' 
                                        : 'border-zinc-700 text-zinc-400 hover:text-white'
                                    }
                                >
                                    {size.charAt(0).toUpperCase() + size.slice(1)}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Theme */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">
                            Theme
                        </label>
                        <div className="flex gap-2">
                            {(['dark', 'light', 'system'] as const).map(theme => (
                                <Button
                                    key={theme}
                                    variant={settings.theme === theme ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setSettings(s => ({ ...s, theme: theme }))}
                                    className={settings.theme === theme 
                                        ? 'bg-blue-600 hover:bg-blue-700' 
                                        : 'border-zinc-700 text-zinc-400 hover:text-white'
                                    }
                                >
                                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                                </Button>
                            ))}
                        </div>
                        <p className="text-xs text-zinc-500">
                            Note: Only dark theme is currently supported
                        </p>
                    </div>

                    {/* Danger Zone */}
                    <div className="pt-4 border-t border-zinc-800">
                        <h4 className="text-sm font-medium text-red-400 mb-2">Danger Zone</h4>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearData}
                            className="border-red-800 text-red-400 hover:bg-red-900/20 hover:text-red-300"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear All Data
                        </Button>
                        <p className="text-xs text-zinc-500 mt-1">
                            This will delete all your chats and settings
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-zinc-400"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        Save Changes
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
