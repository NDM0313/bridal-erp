/**
 * Design System Tokens
 * Centralized design tokens for consistent UI
 * Based on Modern SaaS Dashboard Design
 */

export const designTokens = {
  colors: {
    // Backgrounds
    background: {
      primary: 'bg-slate-950',
      secondary: 'bg-slate-900/40',
      tertiary: 'bg-slate-950/50',
      card: 'bg-slate-900/40',
    },
    // Borders
    border: {
      default: 'border-slate-800/50',
      hover: 'border-slate-700',
      accent: 'border-blue-500/20',
      focus: 'border-blue-500',
    },
    // Text
    text: {
      primary: 'text-slate-100',
      secondary: 'text-slate-400',
      tertiary: 'text-slate-500',
      muted: 'text-slate-600',
    },
    // Accents
    accent: {
      primary: 'bg-blue-600 hover:bg-blue-500',
      secondary: 'bg-blue-600/10 text-blue-400',
      border: 'border-blue-500/20',
      shadow: 'shadow-[0_0_15px_rgba(37,99,235,0.3)]',
    },
    // Status
    status: {
      success: {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/20',
      },
      warning: {
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        border: 'border-amber-500/20',
      },
      error: {
        bg: 'bg-rose-500/10',
        text: 'text-rose-400',
        border: 'border-rose-500/20',
      },
      info: {
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        border: 'border-blue-500/20',
      },
    },
  },
  spacing: {
    xs: 'p-2',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  },
  borderRadius: {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    full: 'rounded-full',
  },
  effects: {
    glass: 'backdrop-blur-md',
    glassXL: 'backdrop-blur-xl',
    shadow: 'shadow-lg',
    shadowAccent: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]',
  },
} as const;

/**
 * Utility function to combine design tokens
 */
export function getCardClasses() {
  return `${designTokens.colors.background.card} ${designTokens.effects.glass} ${designTokens.colors.border.default} ${designTokens.borderRadius.md}`;
}

export function getButtonClasses(variant: 'primary' | 'secondary' | 'ghost' = 'primary') {
  const base = 'rounded-lg font-medium transition-all duration-200';
  
  switch (variant) {
    case 'primary':
      return `${base} ${designTokens.colors.accent.primary} text-white ${designTokens.colors.accent.shadow}`;
    case 'secondary':
      return `${base} ${designTokens.colors.border.default} ${designTokens.colors.text.secondary} hover:bg-slate-800/50 hover:text-white`;
    case 'ghost':
      return `${base} text-slate-400 hover:bg-slate-800/50 hover:text-white`;
    default:
      return base;
  }
}

