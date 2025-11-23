'use client';

import { HTMLAttributes, ReactNode } from 'react';
import { Heading, Text } from '@radix-ui/themes';
import clsx from 'clsx';

export interface SectionHeadingProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact';
}

export function SectionHeading({ 
  title, 
  subtitle, 
  size = 'md',
  variant = 'default',
  className,
  ...props 
}: SectionHeadingProps) {
  const headingSize = {
    sm: '3',
    md: '3',
    lg: '4',
  }[size];

  const headingClass = "heading-font text-gray-900 font-semibold uppercase tracking-[0.12em]";

  return (
    <div className={clsx(variant === 'compact' && 'mb-4', className)} {...props}>
      {variant === 'compact' ? (
        <Heading 
          size={headingSize as any} 
          className={clsx(headingClass, 'text-xs')}
        >
          {title}
        </Heading>
      ) : (
        <>
          <Heading 
            size={headingSize as any} 
            className={clsx(headingClass, 'mb-1')}
          >
            {title}
          </Heading>
          {subtitle && (
            <Text color="gray" size="2">
              {subtitle}
            </Text>
          )}
        </>
      )}
    </div>
  );
}

