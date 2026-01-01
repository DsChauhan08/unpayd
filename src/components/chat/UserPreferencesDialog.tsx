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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
    getUserPreferences, 
    saveUserPreferences, 
    clearUserPreferences,
    type UserContext 
} from '@/lib/userPreferences';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { User, Briefcase, Globe, MessageSquare, Plus, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserPreferencesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UserPreferencesDialog({ open, onOpenChange }: UserPreferencesDialogProps) {
    const { user } = useAuth();
    const [preferences, setPreferences] = useState<UserContext | null>(null);
    const [newInterest, setNewInterest] = useState('');
    const [newCustomKey, setNewCustomKey] = useState('');
    const [newCustomValue, setNewCustomValue] = useState('');
    
    useEffect(() => {
        if (open && user?.id) {
            const prefs = getUserPreferences(user.id);
            setPreferences(prefs);
        }
    }, [open, user?.id]);
    
    const handleSave = () => {
        if (preferences && user?.id) {
            saveUserPreferences(preferences);
            toast.success('Preferences saved! AI will now use this context.');
            onOpenChange(false);
        }
    };
    
    const handleClear = () => {
        if (user?.id && confirm('Clear all your preferences? This cannot be undone.')) {
            clearUserPreferences(user.id);
            setPreferences(getUserPreferences(user.id));
            toast.success('Preferences cleared');
        }
    };
    
    const addInterest = () => {
        if (newInterest.trim() && preferences) {
            const interests = preferences.interests || [];
            if (!interests.includes(newInterest.trim())) {
                setPreferences({
                    ...preferences,
                    interests: [...interests, newInterest.trim()]
                });
            }
            setNewInterest('');
        }
    };
    
    const removeInterest = (interest: string) => {
        if (preferences) {
            setPreferences({
                ...preferences,
                interests: (preferences.interests || []).filter(i => i !== interest)
            });
        }
    };
    
    const addCustomPreference = () => {
        if (newCustomKey.trim() && newCustomValue.trim() && preferences) {
            setPreferences({
                ...preferences,
                customPreferences: {
                    ...preferences.customPreferences,
                    [newCustomKey.trim()]: newCustomValue.trim()
                }
            });
            setNewCustomKey('');
            setNewCustomValue('');
        }
    };
    
    const removeCustomPreference = (key: string) => {
        if (preferences) {
            const { [key]: _, ...rest } = preferences.customPreferences;
            setPreferences({
                ...preferences,
                customPreferences: rest
            });
        }
    };
    
    if (!preferences) return null;
    
    const communicationStyles = [
        { value: 'formal', label: 'Formal', desc: 'Professional tone' },
        { value: 'casual', label: 'Casual', desc: 'Friendly and relaxed' },
        { value: 'technical', label: 'Technical', desc: 'Detailed explanations' },
        { value: 'simple', label: 'Simple', desc: 'Easy to understand' },
    ] as const;
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-border text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Your Preferences
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Customize how the AI responds to you. This context will be used across all chats.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Basic Info
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs text-muted-foreground">Name</label>
                                <Input
                                    value={preferences.name || ''}
                                    onChange={(e) => setPreferences({ ...preferences, name: e.target.value })}
                                    placeholder="Your name"
                                    className="h-9"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-xs text-muted-foreground">Language</label>
                                <Input
                                    value={preferences.language || ''}
                                    onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                                    placeholder="e.g., English"
                                    className="h-9"
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Briefcase className="w-3 h-3" />
                                    Profession
                                </label>
                                <Input
                                    value={preferences.profession || ''}
                                    onChange={(e) => setPreferences({ ...preferences, profession: e.target.value })}
                                    placeholder="e.g., Software Engineer"
                                    className="h-9"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Globe className="w-3 h-3" />
                                    Timezone
                                </label>
                                <Input
                                    value={preferences.timezone || ''}
                                    onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                                    placeholder="e.g., EST, PST"
                                    className="h-9"
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* Communication Style */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Communication Style
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-2">
                            {communicationStyles.map(style => (
                                <button
                                    key={style.value}
                                    onClick={() => setPreferences({ ...preferences, communicationStyle: style.value })}
                                    className={cn(
                                        "p-3 rounded-lg border text-left transition-all",
                                        preferences.communicationStyle === style.value
                                            ? "border-primary bg-primary/10"
                                            : "border-border hover:border-muted-foreground"
                                    )}
                                >
                                    <div className="text-sm font-medium">{style.label}</div>
                                    <div className="text-xs text-muted-foreground">{style.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Interests */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium">Interests</h4>
                        
                        <div className="flex flex-wrap gap-2">
                            {preferences.interests?.map(interest => (
                                <span
                                    key={interest}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-full text-xs"
                                >
                                    {interest}
                                    <button
                                        onClick={() => removeInterest(interest)}
                                        className="hover:text-destructive"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        
                        <div className="flex gap-2">
                            <Input
                                value={newInterest}
                                onChange={(e) => setNewInterest(e.target.value)}
                                placeholder="Add interest..."
                                className="h-8 text-sm"
                                onKeyDown={(e) => e.key === 'Enter' && addInterest()}
                            />
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={addInterest}
                                className="h-8"
                            >
                                <Plus className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                    
                    {/* Custom Preferences */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium">Custom Preferences</h4>
                        <p className="text-xs text-muted-foreground">
                            Add any specific information you want the AI to remember about you.
                        </p>
                        
                        <div className="space-y-2">
                            {Object.entries(preferences.customPreferences).map(([key, value]) => (
                                <div key={key} className="flex items-center gap-2 p-2 bg-secondary rounded-lg">
                                    <span className="text-xs font-medium min-w-[80px]">{key}:</span>
                                    <span className="text-xs text-muted-foreground flex-1 truncate">{value}</span>
                                    <button
                                        onClick={() => removeCustomPreference(key)}
                                        className="text-muted-foreground hover:text-destructive"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex gap-2">
                            <Input
                                value={newCustomKey}
                                onChange={(e) => setNewCustomKey(e.target.value)}
                                placeholder="Key (e.g., 'Favorite editor')"
                                className="h-8 text-sm flex-1"
                            />
                            <Input
                                value={newCustomValue}
                                onChange={(e) => setNewCustomValue(e.target.value)}
                                placeholder="Value (e.g., 'VS Code')"
                                className="h-8 text-sm flex-1"
                            />
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={addCustomPreference}
                                className="h-8"
                            >
                                <Plus className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                    
                    {/* Top Topics (read-only) */}
                    {preferences.topTopics && preferences.topTopics.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Your Top Topics</h4>
                            <p className="text-xs text-muted-foreground">
                                Topics you discuss most frequently (auto-detected).
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {preferences.topTopics.slice(0, 10).map(topic => (
                                    <span
                                        key={topic}
                                        className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground"
                                    >
                                        {topic}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Clear Button */}
                    <div className="pt-4 border-t border-border">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClear}
                            className="border-red-800 text-red-400 hover:bg-red-900/20"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear All Preferences
                        </Button>
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
                    <Button onClick={handleSave}>
                        Save Preferences
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
