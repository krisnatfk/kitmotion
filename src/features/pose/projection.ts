import type { NormalizedLandmark } from "@/features/exercise-engine/core/types";

export interface CoverProjection {
  renderedWidth: number;
  renderedHeight: number;
  cropX: number;
  cropY: number;
}

/** Matches CSS object-fit: cover with the default centered object-position. */
export function getCoverProjection(
  containerWidth: number,
  containerHeight: number,
  sourceWidth: number,
  sourceHeight: number,
): CoverProjection {
  const safeSourceWidth = sourceWidth > 0 ? sourceWidth : containerWidth;
  const safeSourceHeight = sourceHeight > 0 ? sourceHeight : containerHeight;
  const scale = Math.max(
    containerWidth / safeSourceWidth,
    containerHeight / safeSourceHeight,
  );
  const renderedWidth = safeSourceWidth * scale;
  const renderedHeight = safeSourceHeight * scale;
  return {
    renderedWidth,
    renderedHeight,
    cropX: (containerWidth - renderedWidth) / 2,
    cropY: (containerHeight - renderedHeight) / 2,
  };
}

export function projectLandmark(
  landmark: Pick<NormalizedLandmark, "x" | "y">,
  projection: CoverProjection,
  mirror: boolean,
): { x: number; y: number } {
  const sourceX = mirror ? 1 - landmark.x : landmark.x;
  return {
    x: projection.cropX + sourceX * projection.renderedWidth,
    y: projection.cropY + landmark.y * projection.renderedHeight,
  };
}
