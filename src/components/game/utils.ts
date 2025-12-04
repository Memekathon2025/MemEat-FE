import type { Point } from "../../types";

export class GameUtils {
  static getMousePos(canvas: HTMLCanvasElement, evt: MouseEvent): Point {
    const rect = canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    return { x, y };
  }

  static random(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static randomColor(): string {
    const colors = [
      "#C0392B",
      "#E74C3C",
      "#9B59B6",
      "#8E44AD",
      "#2980B9",
      "#3498DB",
      "#17A589",
      "#138D75",
      "#229954",
      "#28B463",
      "#D4AC0D",
      "#D68910",
      "#CA6F1E",
      "#BA4A00",
    ];
    return colors[this.random(0, colors.length - 1)];
  }

  static getDistance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  static getAngle(p1: Point, p2: Point): number {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
  }

  static circleCollision(
    x1: number,
    y1: number,
    r1: number,
    x2: number,
    y2: number,
    r2: number
  ): boolean {
    return this.getDistance({ x: x1, y: y1 }, { x: x2, y: y2 }) < r1 + r2;
  }

  static rotate(p: Point, center: Point, angle: number): Point {
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    // Translate point back to origin
    let px = p.x - center.x;
    let py = p.y - center.y;

    // Rotate point
    const xnew = px * cos - py * sin;
    const ynew = px * sin + py * cos;

    // Translate point back
    return {
      x: xnew + center.x,
      y: ynew + center.y,
    };
  }

  static adjustLuminosity(hex: string, lum: number = 0): string {
    // Validate hex string
    hex = String(hex).replace(/[^0-9a-f]/gi, "");
    if (hex.length < 6) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    // Convert to decimal and change luminosity
    let rgb = "#";
    for (let i = 0; i < 3; i++) {
      let c = parseInt(hex.substr(i * 2, 2), 16);
      c = Math.round(Math.min(Math.max(0, c + c * lum), 255));
      rgb += ("00" + c.toString(16)).substr(-2);
    }

    return rgb;
  }
}
