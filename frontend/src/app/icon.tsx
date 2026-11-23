import { ImageResponse } from "next/og";

import { AppIconArt } from "@/components/brand/AppIconArt";

// Browser tab icon (32) and the Android / "Add to Home Screen" icons (192, 512).
const SIZES = [32, 192, 512];

export function generateImageMetadata() {
  return SIZES.map((size) => ({ id: String(size), size: { width: size, height: size }, contentType: "image/png" }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const size = Number(await id);
  return new ImageResponse(<AppIconArt size={size} rounded={size === 32} />, { width: size, height: size });
}
