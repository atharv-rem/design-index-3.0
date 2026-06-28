const DEFAULT_IMAGE_CDN_URL = "https://images.designindex.xyz";

const imageCdnUrl = (
  import.meta.env.PUBLIC_IMAGE_CDN_URL || DEFAULT_IMAGE_CDN_URL
).replace(/\/+$/, "");

type ImageTransformOptions = {
  width?: number;
  height?: number;
  quality?: number;
  fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
};

const isAbsoluteUrl = (value: string) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const isImageCdnUrl = (value: string) => {
  try {
    const sourceUrl = new URL(value);
    const cdnUrl = new URL(imageCdnUrl);

    return sourceUrl.hostname === cdnUrl.hostname;
  } catch {
    return false;
  }
};

export const getImageSourceUrl = (
  imageUrl: string | null | undefined,
) => {
  const source = imageUrl?.trim();

  if (!source) {
    return "";
  }

  if (!isAbsoluteUrl(source)) {
    return `${imageCdnUrl}/${source.replace(/^\/+/, "")}`;
  }

  const url = new URL(source);

  if (url.hostname.endsWith(".r2.dev")) {
    return `${imageCdnUrl}${url.pathname}${url.search}`;
  }

  return source;
};

export const getOptimizedImageUrl = (
  imageUrl: string | null | undefined,
  options: ImageTransformOptions = {},
) => {
  const sourceUrl = getImageSourceUrl(imageUrl);

  if (!sourceUrl) {
    return "";
  }

  if (isImageCdnUrl(sourceUrl)) {
    return sourceUrl;
  }

  const transformOptions = [
    `width=${options.width ?? 800}`,
    options.height ? `height=${options.height}` : null,
    `quality=${options.quality ?? 80}`,
    "format=auto",
    `fit=${options.fit ?? "cover"}`,
  ]
    .filter(Boolean)
    .join(",");

  return `${imageCdnUrl}/cdn-cgi/image/${transformOptions}/${sourceUrl}`;
};
