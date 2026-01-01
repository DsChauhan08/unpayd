'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
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
import { MODELS } from '@/lib/openrouter';
import { toast } from 'sonner';
import { Trash2, Sun, Moon, Monitor } from 'lucide-react';

interface SettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
    const [settings, setSettings] = useState<AppSettings>(getSettings());
    const { setTheme } = useTheme();
    
    useEffect(() => {
        if (open) {
            setSettings(getSettings());
        }
    }, [open]);

    const handleSave = () => {
        saveSettings(settings);
        // Apply theme immediately using next-themes
        setTheme(settings.theme);
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

    const themeOptions = [
        { value: 'dark' as const, label: 'Dark', icon: Moon },
        { value: 'light' as const, label: 'Light', icon: Sun },
        { value: 'system' as const, label: 'System', icon: Monitor },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-border text-foreground max-w-md">
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Customize your Unpayd experience
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                    {/* Default Model */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            Default Model
                        </label>
                        <select
                            value={settings.defaultModel}
                            onChange={(e) => setSettings(s => ({ ...s, defaultModel: e.target.value }))}
                            className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                        <label className="text-sm font-medium text-foreground">
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
                                        ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                                        : 'border-border text-muted-foreground hover:text-foreground'
                                    }
                                >
                                    {size.charAt(0).toUpperCase() + size.slice(1)}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Theme */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            Theme
                        </label>
                        <div className="flex gap-2">
                            {themeOptions.map(({ value, label, icon: Icon }) => (
                                <Button
                                    key={value}
                                    variant={settings.theme === value ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setSettings(s => ({ ...s, theme: value }))}
                                    className={settings.theme === value 
                                        ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                                        : 'border-border text-muted-foreground hover:text-foreground'
                                    }
                                >
                                    <Icon className="w-4 h-4 mr-1" />
                                    {label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="pt-4 border-t border-border">
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
                        <p className="text-xs text-muted-foreground mt-1">
                            This will delete all your chats and settings
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-muted-foreground"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        Save Changes
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
