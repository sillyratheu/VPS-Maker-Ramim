import React, { useEffect, useRef } from 'react';
import { LogOut } from 'lucide-react';

interface Props {
  onExit: () => void;
}

export const InteractiveCmatrix: React.FC<Props> = ({ onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = canvas.parentElement?.clientHeight || 600;

    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+{}[]~<>';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array.from({ length: columns }, () => Math.floor(Math.random() * -50));

    let animationId: number;

    const render = () => {
      ctx.fillStyle = 'rgba(5, 12, 5, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#22c55e';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Draw leader character bright white/light-green
        ctx.fillStyle = '#86efac';
        ctx.fillText(text, x, y);

        // Previous character in matrix green
        ctx.fillStyle = '#22c55e';
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x, y - fontSize);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'q' || e.key === 'Q' || (e.ctrlKey && e.key.toLowerCase() === 'c')) {
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onExit]);

  return (
    <div className="relative w-full h-full bg-[#050c05] overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-3 bg-neutral-950/80 backdrop-blur border border-emerald-900/60 px-3 py-1.5 rounded-lg text-emerald-400 text-xs font-mono">
        <span>Press <kbd className="px-1.5 py-0.5 bg-emerald-950 rounded border border-emerald-800 text-emerald-300">Q</kbd> or <kbd className="px-1.5 py-0.5 bg-emerald-950 rounded border border-emerald-800 text-emerald-300">Ctrl+C</kbd> to exit</span>
        <button
          onClick={onExit}
          className="flex items-center gap-1 px-2 py-0.5 bg-emerald-900/60 hover:bg-emerald-800 rounded text-emerald-200 transition-colors"
        >
          <LogOut className="w-3 h-3" />
          <span>Exit cmatrix</span>
        </button>
      </div>
    </div>
  );
};
