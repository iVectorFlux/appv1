import React from 'react';
import type { InteractiveViewMode } from '@/data/interactive-catalog';
import { interactiveAssetUrl } from '@/data/interactive-catalog';

interface InteractiveFrameProps {
  file: string;
  mode: InteractiveViewMode;
  title: string;
  height?: number | string;
  fill?: boolean;
}

export function InteractiveFrame({ file, mode, title, height = 540, fill }: InteractiveFrameProps) {
  const src = interactiveAssetUrl(file, mode);
  return (
    <iframe
      src={src}
      title={title}
      style={{
        width: '100%',
        height: fill ? '100%' : height,
        border: 'none',
        borderRadius: fill ? 0 : 16,
        backgroundColor: 'transparent',
        display: 'block',
      }}
    />
  );
}
