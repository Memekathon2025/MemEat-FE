import { SCREEN_SIZE } from "../constants";

export class BackgroundRenderer {
  static drawBackground(
    ctx: CanvasRenderingContext2D,
    pattern: CanvasPattern | null,
    image: HTMLImageElement | null,
    worldOffset: { x: number; y: number }
  ) {
    if (pattern && image) {
      ctx.save();

      const imgWidth = image.width;
      const imgHeight = image.height;

      const patternOffsetX = ((worldOffset.x % imgWidth) + imgWidth) % imgWidth;
      const patternOffsetY =
        ((worldOffset.y % imgHeight) + imgHeight) % imgHeight;

      ctx.fillStyle = pattern;
      ctx.translate(-patternOffsetX, -patternOffsetY);
      ctx.fillRect(
        -patternOffsetX,
        -patternOffsetY,
        SCREEN_SIZE.width + imgWidth * 2,
        SCREEN_SIZE.height + imgHeight * 2
      );

      ctx.restore();
    } else {
      // Fallback
      ctx.fillStyle = "#90c542";
      ctx.fillRect(0, 0, SCREEN_SIZE.width, SCREEN_SIZE.height);
    }
  }
}
