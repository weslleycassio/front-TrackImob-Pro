import type { HTMLAttributes } from 'react';

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  height?: number;
};

export function Skeleton({ className = '', height, style, ...props }: SkeletonProps) {
  return (
    <div
      className={['ui-skeleton', className].filter(Boolean).join(' ')}
      style={height ? { ...style, height: `${height}px` } : style}
      {...props}
    />
  );
}
