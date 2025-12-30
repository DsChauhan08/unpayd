import { cn } from '@/lib/utils';

interface UnpaydLogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showText?: boolean;
}

const sizes = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 32, text: 'text-xl' },
    lg: { icon: 48, text: 'text-2xl' },
    xl: { icon: 64, text: 'text-3xl' },
};

export function UnpaydLogo({ className, size = 'md', showText = true }: UnpaydLogoProps) {
    const { icon, text } = sizes[size];

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <svg
                width={icon}
                height={icon}
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
            >
                {/* Background circle with gradient */}
                <defs>
                    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="50%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                    <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#c084fc" stopOpacity="0.5" />
                    </linearGradient>
                </defs>

                {/* Outer glow */}
                <circle cx="32" cy="32" r="30" fill="url(#glowGradient)" opacity="0.3" />

                {/* Main circle */}
                <circle cx="32" cy="32" r="28" fill="url(#logoGradient)" />

                {/* Inner design - stylized "U" with sparkle */}
                <path
                    d="M22 20v16c0 6.627 4.477 12 10 12s10-5.373 10-12V20"
                    stroke="white"
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                />

                {/* Sparkle accent */}
                <path
                    d="M44 16l1.5 3.5L49 21l-3.5 1.5L44 26l-1.5-3.5L39 21l3.5-1.5L44 16z"
                    fill="white"
                    opacity="0.9"
                />

                {/* Small dot accent */}
                <circle cx="20" cy="44" r="2" fill="white" opacity="0.6" />
            </svg>

            {showText && (
                <span className={cn('font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent', text)}>
                    Unpayd
                </span>
            )}
        </div>
    );
}

// Icon-only version for favicons, app icons
export function UnpaydIcon({ size = 32, className }: { size?: number; className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
            </defs>

            <circle cx="32" cy="32" r="30" fill="url(#iconGradient)" />

            <path
                d="M22 20v16c0 6.627 4.477 12 10 12s10-5.373 10-12V20"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
            />

            <path
                d="M44 16l1.5 3.5L49 21l-3.5 1.5L44 26l-1.5-3.5L39 21l3.5-1.5L44 16z"
                fill="white"
                opacity="0.9"
            />
        </svg>
    );
}
