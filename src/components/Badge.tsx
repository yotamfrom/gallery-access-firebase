import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'category' | 'series' | 'hold' | 'yourHold' | 'onLoan' | 'selected';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function Badge({ children, variant = 'category', className, onClick }: BadgeProps) {
  const variantClasses = {
    category: 'bg-secondary text-muted-foreground border border-border',
    series: 'bg-secondary text-foreground border border-border',
    hold: 'bg-warning/20 text-warning-foreground border border-warning',
    yourHold: 'bg-primary/10 text-primary border border-primary',
    onLoan: 'bg-purple-100 text-purple-800 border border-purple-400 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-500',
    selected: 'bg-accent/10 text-accent border border-accent',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
        variantClasses[variant],
        className
      )}
      onClick={onClick}
    >
      {children}
    </span>
  );
}
