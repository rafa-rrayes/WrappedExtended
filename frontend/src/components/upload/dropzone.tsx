"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";

interface DropzoneProps {
  onFile: (file: File) => void;
  dragActive: boolean;
  setDragActive: (active: boolean) => void;
}

export function Dropzone({ onFile, dragActive, setDragActive }: DropzoneProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file?.name.endsWith(".zip")) onFile(file);
    },
    [onFile, setDragActive]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      className={cn(
        "border-2 border-dashed rounded-[var(--radius-card)] p-16 text-center transition-all cursor-pointer",
        dragActive ? "border-green bg-green-dim" : "border-border hover:border-text-muted"
      )}
    >
      <input
        type="file"
        accept=".zip"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
        className="hidden"
        id="dropzone-input"
      />
      <label htmlFor="dropzone-input" className="cursor-pointer">
        <p className="text-text-secondary mb-1">
          Drag & drop your Spotify export here, or click to browse
        </p>
        <p className="text-text-muted text-sm">Accepts .zip files only</p>
      </label>
    </div>
  );
}
