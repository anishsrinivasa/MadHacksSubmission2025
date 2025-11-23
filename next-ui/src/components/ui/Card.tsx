'use client';

import { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  noShadow?: boolean;
}

export function Card({ 
  children, 
  header, 
  footer, 
  padding = 'md',
  noShadow = false,
  className,
  ...props 
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-gray-200 flex flex-col min-h-0',
        !noShadow && 'shadow-sm',
        className
      )}
      {...props}
    >
      {header && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          {header}
        </div>
      )}
      <div
        className={clsx(
          paddingClasses[padding],
          'flex-1 min-h-0 flex flex-col'
        )}
      >
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {footer}
        </div>
      )}
    </div>
  );
}

