import { useEffect, useRef, useState } from "react";

type ToolImageProps = {
  src?: string;
  alt: string;
  priority?: boolean;
  width?: number;
  height?: number;
};

export default function ToolImage({ src, alt, priority = false, width, height }: ToolImageProps) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  // Images that errored before hydration never fire onError in React.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, [src]);

  if (!src || failed) {
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-[var(--app-surface-soft)]">
        <span className="font-(family-name:--font-inter-stack) text-sm font-medium theme-text-soft">
          no photo available
        </span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "low"}
      referrerPolicy="no-referrer"
      width={width}
      height={height}
      src={src}
      onError={() => setFailed(true)}
      className="aspect-video w-full object-cover transition duration-200 group-hover:scale-[1.02]"
    />
  );
}
