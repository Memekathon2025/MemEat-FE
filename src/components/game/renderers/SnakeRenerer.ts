import type { SnakeColors, SnakeBodyPart } from "../types";

export class SnakeRenderer {
  /**
   * 뱀 몸통 그리기
   */
  static drawBody(
    ctx: CanvasRenderingContext2D,
    bodyParts: SnakeBodyPart[],
    size: number,
    colors: SnakeColors
  ) {
    for (let i = bodyParts.length - 1; i >= 0; i--) {
      const part = bodyParts[i];
      const sizeRatio = 1 - (i / bodyParts.length) * 0.3;
      const radius = size * sizeRatio;

      const grd = ctx.createRadialGradient(
        part.x,
        part.y,
        2,
        part.x + 4,
        part.y + 4,
        10
      );
      grd.addColorStop(0, colors.supportColor);
      grd.addColorStop(1, colors.midColor);

      ctx.fillStyle = colors.mainColor;
      ctx.beginPath();
      ctx.arc(part.x, part.y, radius + 1, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(part.x, part.y, radius, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  /**
   * 뱀 머리 그리기
   */
  static drawHead(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
    colors: SnakeColors
  ) {
    const headSize = size * 1.03;
    const grd = ctx.createRadialGradient(
      centerX,
      centerY,
      2,
      centerX + 4,
      centerY + 4,
      10
    );
    grd.addColorStop(0, colors.supportColor);
    grd.addColorStop(1, colors.midColor);

    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(centerX, centerY, headSize + 1, 0, 2 * Math.PI);
    ctx.fill();
  }

  /**
   * 더듬이 그리기
   */
  static drawAntenna(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    angle: number,
    size: number
  ) {
    const headSize = size * 1.03;
    const antennaLength = size * 1.8;
    const antennaWidth = 1.5;
    const antennaColor = "#000";

    for (let side = -1; side <= 1; side += 2) {
      const antennaAngle = angle + (Math.PI / 4) * side;
      const antennaStartX = centerX + headSize * 0.8 * Math.cos(angle);
      const antennaStartY = centerY + headSize * 0.8 * Math.sin(angle);
      const antennaEndX =
        antennaStartX + antennaLength * Math.cos(antennaAngle);
      const antennaEndY =
        antennaStartY + antennaLength * Math.sin(antennaAngle);

      ctx.strokeStyle = antennaColor;
      ctx.lineWidth = antennaWidth;
      ctx.beginPath();
      ctx.moveTo(antennaStartX, antennaStartY);
      ctx.lineTo(antennaEndX, antennaEndY);
      ctx.stroke();

      ctx.fillStyle = antennaColor;
      ctx.beginPath();
      ctx.arc(antennaEndX, antennaEndY, 2, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  /**
   * 다리 그리기
   */
  static drawLegs(
    ctx: CanvasRenderingContext2D,
    bodyParts: SnakeBodyPart[],
    angle: number,
    size: number
  ) {
    const legLength = size * 1.5;
    const legWidth = 2;
    const legColor = "#000";
    const legCount = Math.min(6, Math.floor(bodyParts.length / 3));

    for (let i = 0; i < legCount; i++) {
      const partIndex = Math.floor((i / legCount) * bodyParts.length);
      if (partIndex >= bodyParts.length) continue;

      const part = bodyParts[partIndex];
      const partSize = size * (1 - (partIndex / bodyParts.length) * 0.3);

      for (let side = -1; side <= 1; side += 2) {
        const legAngle = angle + (Math.PI / 3) * side;
        const legStartX =
          part.x + partSize * 0.7 * Math.cos(angle + (Math.PI / 2) * side);
        const legStartY =
          part.y + partSize * 0.7 * Math.sin(angle + (Math.PI / 2) * side);
        const legEndX = legStartX + legLength * Math.cos(legAngle);
        const legEndY = legStartY + legLength * Math.sin(legAngle);

        ctx.strokeStyle = legColor;
        ctx.lineWidth = legWidth;
        ctx.beginPath();
        ctx.moveTo(legStartX, legStartY);
        ctx.lineTo(legEndX, legEndY);
        ctx.stroke();
      }
    }
  }

  /**
   * 눈 그리기
   */
  static drawEyes(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    angle: number,
    size: number
  ) {
    const headSize = size * 1.03;
    const eyeDistance = headSize / 2;
    const eyeAngle = Math.PI / 6;

    const eye1 = {
      x: centerX + eyeDistance * 2 * Math.cos(angle + eyeAngle),
      y: centerY + eyeDistance * 2 * Math.sin(angle + eyeAngle),
    };
    const eye2 = {
      x: centerX + eyeDistance * 2 * Math.cos(angle - eyeAngle),
      y: centerY + eyeDistance * 2 * Math.sin(angle - eyeAngle),
    };

    [eye1, eye2].forEach((eye) => {
      ctx.fillStyle = "black";
      ctx.beginPath();
      ctx.arc(eye.x, eye.y, size / 2, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = "whitesmoke";
      ctx.beginPath();
      ctx.arc(
        eye.x + Math.cos(angle),
        eye.y + Math.sin(angle),
        size / 4,
        0,
        2 * Math.PI
      );
      ctx.fill();
    });
  }

  /**
   * 이름 그리기
   */
  static drawName(
    ctx: CanvasRenderingContext2D,
    name: string,
    centerX: number,
    centerY: number,
    size: number
  ) {
    ctx.fillStyle = "whitesmoke";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(name, centerX, centerY - size - 10);
  }

  /**
   * 전체 뱀 그리기 (합성 함수)
   */
  static drawSnake(
    ctx: CanvasRenderingContext2D,
    bodyParts: SnakeBodyPart[],
    centerX: number,
    centerY: number,
    angle: number,
    size: number,
    colors: SnakeColors,
    name: string
  ) {
    this.drawBody(ctx, bodyParts, size, colors);
    this.drawHead(ctx, centerX, centerY, size, colors);
    this.drawAntenna(ctx, centerX, centerY, angle, size);
    this.drawLegs(ctx, bodyParts, angle, size);
    this.drawEyes(ctx, centerX, centerY, angle, size);
    this.drawName(ctx, name, centerX, centerY, size);
  }
}
