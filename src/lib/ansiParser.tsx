import React from 'react';

// Maps basic ANSI 16-color codes and 256-color codes to CSS classes/colors
export function parseAnsiToReact(rawText: string): React.ReactNode[] {
  if (!rawText) return [];

  // Match ANSI escape codes like \x1b[32m or \x1b[1;34m or \x1b[0m
  const regex = /\x1b\[([0-9;]*)m/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let currentColor = '';
  let isBold = false;
  let isUnderline = false;
  let keyCounter = 0;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(rawText)) !== null) {
    const textChunk = rawText.substring(lastIndex, match.index);
    if (textChunk) {
      nodes.push(
        <span
          key={`ansi-${keyCounter++}`}
          style={{ color: currentColor || undefined }}
          className={`${isBold ? 'font-bold ' : ''}${isUnderline ? 'underline ' : ''}`}
        >
          {textChunk}
        </span>
      );
    }

    const code = match[1];
    if (!code || code === '0') {
      currentColor = '';
      isBold = false;
      isUnderline = false;
    } else {
      const parts = code.split(';');
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p === '1') isBold = true;
        else if (p === '4') isUnderline = true;
        else if (p === '30') currentColor = '#6b7280'; // Black/Gray
        else if (p === '31') currentColor = '#ef4444'; // Red
        else if (p === '32') currentColor = '#22c55e'; // Green
        else if (p === '33') currentColor = '#eab308'; // Yellow
        else if (p === '34') currentColor = '#3b82f6'; // Blue
        else if (p === '35') currentColor = '#a855f7'; // Magenta
        else if (p === '36') currentColor = '#06b6d4'; // Cyan
        else if (p === '37') currentColor = '#f3f4f6'; // White
        else if (p === '38' && parts[i + 1] === '5') {
          // 256 color format: 38;5;208 (orange for Ubuntu)
          const colorCode = parts[i + 2];
          if (colorCode === '208') currentColor = '#e95420'; // Ubuntu orange
          else if (colorCode === '100') currentColor = '#4b5563';
          i += 2;
        }
      }
    }

    lastIndex = regex.lastIndex;
  }

  // Push remainder
  const remaining = rawText.substring(lastIndex);
  if (remaining) {
    nodes.push(
      <span
        key={`ansi-${keyCounter++}`}
        style={{ color: currentColor || undefined }}
        className={`${isBold ? 'font-bold ' : ''}${isUnderline ? 'underline ' : ''}`}
      >
        {remaining}
      </span>
    );
  }

  return nodes;
}
