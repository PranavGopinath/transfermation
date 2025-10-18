'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`inline-block ${sizeClasses[size]} ${className}`}>
      <div className="relative h-full w-full">
        {/* Main gradient circle that rotates */}
        <div 
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            background: 'conic-gradient(from 0deg, #3b82f6, #8b5cf6, #ec4899, #f59e0b, #10b981, #3b82f6)',
            animationDuration: '2s'
          }}
        />
        {/* Inner circle to create the donut effect */}
        <div className="absolute inset-1 rounded-full bg-background" />
        {/* Pulsing overlay for extra effect */}
        <div 
          className="absolute inset-0 rounded-full animate-pulse opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)'
          }}
        />
      </div>
    </div>
  );
}
