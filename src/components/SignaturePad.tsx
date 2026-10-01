'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, Check, Undo2 } from 'lucide-react';

interface SignaturePadProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function SignaturePad({ value, onChange, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(Boolean(value));
  const [history, setHistory] = useState<ImageData[]>([]);

  // Initialize or resize canvas
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Set actual canvas size in memory
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Scale context back down
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#38bdf8'; // Sky blue / BPJS accent
    ctx.lineWidth = 2.5;

    // If initial value exists, draw it
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = value;
    }
  }, [value]);

  useEffect(() => {
    setupCanvas();
  }, [setupCanvas]);

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-10), data]);
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    saveHistory();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
  };

  const clearCanvas = () => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setHistory([]);
    onChange('');
  };

  const undo = () => {
    if (disabled || history.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const previousState = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    ctx.putImageData(previousState, 0, 0);

    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
    setHasDrawn(history.length > 1);
  };

  return (
    <div className="w-full">
      <div
        className="relative rounded-xl overflow-hidden transition-all"
        style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-glass-border)',
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-44 cursor-crosshair touch-none"
        />

        {!hasDrawn && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-xs text-text-muted">
              Goreskan tanda tangan Anda di sini (Mouse atau Layar Sentuh)
            </p>
          </div>
        )}

        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/40 backdrop-blur-md p-1 rounded-lg border border-white/5">
          {history.length > 0 && (
            <button
              type="button"
              onClick={undo}
              disabled={disabled}
              className="p-1.5 text-xs text-text-secondary hover:text-text-primary rounded hover:bg-white/10 transition-colors"
              title="Undo goresan"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={clearCanvas}
            disabled={disabled || !hasDrawn}
            className="flex items-center gap-1 px-2 py-1 text-xs text-accent-rose hover:bg-accent-rose/10 rounded transition-colors disabled:opacity-40"
            title="Hapus tanda tangan"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Bersihkan</span>
          </button>
        </div>
      </div>
      {hasDrawn && (
        <div className="flex items-center gap-1 mt-1 text-xs text-accent-green">
          <Check className="w-3.5 h-3.5" />
          <span>Tanda tangan tersimpan</span>
        </div>
      )}
    </div>
  );
}
