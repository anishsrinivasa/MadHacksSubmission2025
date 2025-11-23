'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
}

const buttonVariants = {
  primary: 'gradient-button text-white shadow-md hover:shadow-lg',
  secondary: 'bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 text-[var(--madhacks-dark-blue)] hover:from-blue-100 hover:to-blue-200',
  ghost: 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200',
  danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200',
  success: 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200',
  outline: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg font-semibold',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    fullWidth = false,
    isLoading = false,
    className, 
    children, 
    disabled,
    ...props 
  }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'font-medium rounded-lg transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-[var(--madhacks-blue)] focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          buttonVariants[variant],
          buttonSizes[size],
          fullWidth && 'w-full',
          isLoading && 'opacity-70 cursor-wait',
          className
        )}
        style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading...
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

