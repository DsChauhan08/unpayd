'use client';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MODELS, type ModelKey } from '@/lib/openrouter';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
    value: ModelKey;
    onChange: (model: ModelKey) => void;
    disabled?: boolean;
}

const modelOrder: ModelKey[] = ['quick', 'general', 'code', 'deepthink'];

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
    const currentModel = MODELS[value];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-2 px-3 text-zinc-400 hover:text-white hover:bg-zinc-800"
                    disabled={disabled}
                >
                    <span>{currentModel.icon}</span>
                    <span className="font-medium">{currentModel.name}</span>
                    <ChevronDown className="w-3 h-3 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="w-64 bg-zinc-900 border-zinc-800"
            >
                {modelOrder.map((key) => {
                    const model = MODELS[key];
                    const isSelected = key === value;

                    return (
                        <DropdownMenuItem
                            key={key}
                            onClick={() => onChange(key)}
                            className={cn(
                                "flex items-start gap-3 p-3 cursor-pointer",
                                isSelected && "bg-zinc-800"
                            )}
                        >
                            <span className="text-lg">{model.icon}</span>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-white">{model.name}</span>
                                    {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                                </div>
                                <p className="text-xs text-zinc-500">{model.description}</p>
                            </div>
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
