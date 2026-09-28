import { useEffect, useRef } from "react";

const MAX_PREVIEW_DIMENSION = 1600;

export function LocalImagePreview({ file, className, alt = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !file) return undefined;

    let active = true;
    let bitmap = null;

    async function renderPreview() {
      try {
        bitmap = await createImageBitmap(file);
        if (!active) return;

        const scale = Math.min(1, MAX_PREVIEW_DIMENSION / Math.max(bitmap.width, bitmap.height));
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d");
        context?.clearRect(0, 0, canvas.width, canvas.height);
        context?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      } catch {
        if (active) {
          canvas.width = 0;
          canvas.height = 0;
        }
      } finally {
        bitmap?.close();
        bitmap = null;
      }
    }

    void renderPreview();

    return () => {
      active = false;
      bitmap?.close();
    };
  }, [file]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    />
  );
}
