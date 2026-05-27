'use client';

import { useEffect, useRef, useCallback } from 'react';
import { WebGLPreview, PreviewParams, defaultParams } from '@/lib/webglPreview';

interface PreviewCanvasProps {
  videoElement: HTMLVideoElement | null;
  params?: PreviewParams;
  width?: number;
  height?: number;
}

export default function PreviewCanvas({
  videoElement,
  params = defaultParams,
  width = 640,
  height = 360,
}: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webglRef = useRef<WebGLPreview | null>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      webglRef.current = new WebGLPreview(canvasRef.current);
    } catch (error) {
      console.error('WebGL setup failed:', error);
    }
    return () => {
      webglRef.current?.destroy();
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const renderLoop = useCallback(() => {
    if (webglRef.current && videoElement &&
        !videoElement.paused && !videoElement.ended) {
      webglRef.current.render(videoElement, params);
    }
    animFrameRef.current = requestAnimationFrame(renderLoop);
  }, [videoElement, params]);

  useEffect(() => {
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [renderLoop]);

  useEffect(() => {
    if (videoElement && webglRef.current) {
      const handleSeeked = () => {
        webglRef.current?.render(videoElement, params);
      };
      videoElement.addEventListener('seeked', handleSeeked);
      return () => videoElement.removeEventListener('seeked', handleSeeked);
    }
  }, [videoElement, params]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full rounded-lg bg-black"
    />
  );
}