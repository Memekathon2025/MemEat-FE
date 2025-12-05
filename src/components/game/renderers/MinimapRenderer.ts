import { SCREEN_SIZE, WORLD_SIZE } from "../constants";

export class MinimapRenderer {
  static draw(
    ctx: CanvasRenderingContext2D,
    playerRef: any,
    worldOffset: { x: number; y: number }
  ) {
    ctx.globalAlpha = 0.5;

    const mapSize = { width: 100, height: 50 };
    const startX = 20;
    const startY = SCREEN_SIZE.height - mapSize.height - 20;

    // 미니맵 배경
    ctx.fillStyle = "white";
    ctx.fillRect(startX, startY, mapSize.width, mapSize.height);

    ctx.globalAlpha = 1;

    // 현재 플레이어 위치 표시
    if (playerRef) {
      const worldX = worldOffset.x + SCREEN_SIZE.width / 2;
      const worldY = worldOffset.y + SCREEN_SIZE.height / 2;

      const adjustedX = worldX + 1200;
      const adjustedY = worldY + 600;

      const playerInMapX = (mapSize.width / WORLD_SIZE.width) * adjustedX;
      const playerInMapY = (mapSize.height / WORLD_SIZE.height) * adjustedY;

      ctx.fillStyle = playerRef.mainColor;
      ctx.beginPath();
      ctx.arc(startX + playerInMapX, startY + playerInMapY, 3, 0, 2 * Math.PI);
      ctx.fill();

      // 맵 테두리
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, startY, mapSize.width, mapSize.height);
    }
  }
}
