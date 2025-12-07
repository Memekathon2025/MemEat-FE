import React, { useEffect, useRef, useState, useCallback } from "react";
import { socketService } from "../../services/socket";
import { useGameStore } from "../../store/gameStore";
import { GameUtils } from "./utils";

import { SnakeRenderer } from "./renderers/SnakeRenerer";
import { BackgroundRenderer } from "./renderers/BackgroundRendrer";
import { MinimapRenderer } from "./renderers/MinimapRenderer";

import { useGameLoop } from "../../hooks/useGameLoop";
import { useOtherPlayers } from "../../hooks/useOtherPlayers";

// 📦 Constants & Types
import {
  SCREEN_SIZE,
  SPAWN_ZONE_SIZE,
  MAP_CENTER,
  BASE_SIZE,
  SIZE_INCREASE_INTERVAL,
  SIZE_INCREMENT,
  MAX_SIZE,
  LERP_FACTOR,
  MAX_VISIBLE_PLAYERS,
} from "./constants";
import type { LocalPlayer, SnakeBodyPart, SnakeColors } from "./types";
import type { Player, Point } from "../../types";

import "../../styles/GameCanvas.css";
import backgroundImage from "../../assets/background.jpg";

export const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundPatternRef = useRef<CanvasPattern | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);

  const { currentPlayer, setCurrentPlayer, removeFood } = useGameStore();

  const [localPlayer, setLocalPlayer] = useState<LocalPlayer | null>(null);
  const localPlayerRef = useRef<LocalPlayer | null>(null);
  const worldRef = useRef<Point>({ x: -400, y: -100 });
  const velocityRef = useRef<Point>({ x: 0, y: 0 });
  const angleRef = useRef<number>(0);
  const [isPaused, setIsPaused] = useState(true);
  const isPausedRef = useRef<boolean>(true);

  const {
    bodyPartsRef,
    colorsRef,
    initializePlayer,
    updateTarget,
    interpolate,
  } = useOtherPlayers();

  // 1. 플레이어 초기화
  useEffect(() => {
    if (!currentPlayer) return;

    const player: LocalPlayer = {
      ...currentPlayer,
      bodyParts: Array(currentPlayer.length)
        .fill(null)
        .map(() => ({
          x: SCREEN_SIZE.width / 2,
          y: SCREEN_SIZE.height / 2,
        })),
      size: BASE_SIZE,
      force: 5,
      mainColor: GameUtils.randomColor(),
      midColor: "",
      supportColor: "",
    };
    player.midColor = GameUtils.adjustLuminosity(player.mainColor, 0.33);
    player.supportColor = GameUtils.adjustLuminosity(player.midColor, 0.33);

    setLocalPlayer(player);
    localPlayerRef.current = player;
  }, [currentPlayer?.id]);

  // 2. 소켓 리스너 설정
  useEffect(() => {
    // 게임 상태 업데이트
    socketService.onGameState((state) => {
      state.players.forEach((player) => {
        if (player.id === currentPlayer?.id) return;

        // useOtherPlayers 훅 사용
        initializePlayer(player);
        updateTarget(player.id, player.position, player.angle || 0);

        // bodyParts 길이 조정
        const bodyParts = bodyPartsRef.current.get(player.id);
        if (bodyParts) {
          while (bodyParts.length < player.length) {
            const lastPart = bodyParts[bodyParts.length - 1];
            bodyParts.push({ x: lastPart.x, y: lastPart.y });
          }
          while (bodyParts.length > player.length) {
            bodyParts.pop();
          }
        }
      });
    });

    // 음식 먹기
    socketService.onFoodEaten((data) => {
      removeFood(data.foodId);
    });

    // 플레이어 업데이트
    socketService.onPlayerUpdated((updatedPlayer) => {
      if (currentPlayer && updatedPlayer.id === currentPlayer.id) {
        setCurrentPlayer(updatedPlayer);
        setLocalPlayer((prev) => {
          if (!prev) return prev;

          const newBodyParts: SnakeBodyPart[] = [...prev.bodyParts];
          while (newBodyParts.length < updatedPlayer.length) {
            const lastPart = newBodyParts[newBodyParts.length - 1];
            newBodyParts.push({ x: lastPart.x, y: lastPart.y });
          }

          const sizeBonus = Math.floor(
            updatedPlayer.length / SIZE_INCREASE_INTERVAL
          );
          let newSize = BASE_SIZE + sizeBonus * SIZE_INCREMENT;
          if (newSize > MAX_SIZE) newSize = MAX_SIZE;

          const updated: LocalPlayer = {
            ...prev,
            score: updatedPlayer.score,
            length: updatedPlayer.length,
            size: newSize,
            bodyParts: newBodyParts,
            collectedTokens: updatedPlayer.collectedTokens,
          };

          localPlayerRef.current = updated;
          return updated;
        });
      }
    });
  }, [
    currentPlayer?.id,
    initializePlayer,
    updateTarget,
    bodyPartsRef,
    removeFood,
    setCurrentPlayer,
  ]);

  // 3. 배경 이미지 로드
  useEffect(() => {
    const img = new Image();
    img.src = backgroundImage;
    img.onload = () => {
      backgroundImageRef.current = img;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          backgroundPatternRef.current = ctx.createPattern(img, "repeat");
        }
      }
    };
    img.onerror = () => {
      console.error("Failed to load background image");
    };
  }, []);

  // 4. 플레이어 이동 업데이트
  const updatePlayerMovement = useCallback(() => {
    if (!localPlayerRef.current || isPausedRef.current) return;

    const playerRef = localPlayerRef.current;

    // 속도 업데이트
    velocityRef.current = {
      x: playerRef.force * Math.cos(angleRef.current),
      y: playerRef.force * Math.sin(angleRef.current),
    };

    // 월드 오프셋 업데이트
    worldRef.current = {
      x: worldRef.current.x + velocityRef.current.x,
      y: worldRef.current.y + velocityRef.current.y,
    };

    // bodyParts 업데이트
    const d = playerRef.size / 2;

    for (let i = playerRef.bodyParts.length - 1; i >= 1; i--) {
      playerRef.bodyParts[i].x =
        playerRef.bodyParts[i - 1].x - d * Math.cos(angleRef.current);
      playerRef.bodyParts[i].y =
        playerRef.bodyParts[i - 1].y - d * Math.sin(angleRef.current);
    }

    if (playerRef.bodyParts.length > 0) {
      const headX = SCREEN_SIZE.width / 2;
      const headY = SCREEN_SIZE.height / 2;
      playerRef.bodyParts[0].x = headX - d * Math.cos(angleRef.current);
      playerRef.bodyParts[0].y = headY - d * Math.sin(angleRef.current);
    }

    // 서버에 위치 업데이트
    socketService.updatePosition({
      x: -worldRef.current.x + SCREEN_SIZE.width / 2,
      y: -worldRef.current.y + SCREEN_SIZE.height / 2,
      angle: angleRef.current,
    });
  }, []);

  // 5. 렌더링 함수들
  const renderSafeZone = useCallback((ctx: CanvasRenderingContext2D) => {
    const spawnScreenX = SCREEN_SIZE.width - MAP_CENTER.x - worldRef.current.x;
    const spawnScreenY = SCREEN_SIZE.height - MAP_CENTER.y - worldRef.current.y;

    const margin = 100;
    if (
      spawnScreenX > -SPAWN_ZONE_SIZE - margin &&
      spawnScreenX < SCREEN_SIZE.width + margin &&
      spawnScreenY > -SPAWN_ZONE_SIZE - margin &&
      spawnScreenY < SCREEN_SIZE.height + margin
    ) {
      ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
      ctx.fillRect(
        spawnScreenX - SPAWN_ZONE_SIZE / 2,
        spawnScreenY - SPAWN_ZONE_SIZE / 2,
        SPAWN_ZONE_SIZE,
        SPAWN_ZONE_SIZE
      );

      ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        spawnScreenX - SPAWN_ZONE_SIZE / 2,
        spawnScreenY - SPAWN_ZONE_SIZE / 2,
        SPAWN_ZONE_SIZE,
        SPAWN_ZONE_SIZE
      );

      ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
      ctx.beginPath();
      ctx.arc(spawnScreenX, spawnScreenY, 5, 0, 2 * Math.PI);
      ctx.fill();

      ctx.font = "bold 16px Arial";
      ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
      ctx.textAlign = "center";
      ctx.fillText(
        "SAFE ZONE (Press Spacebar to Start",
        spawnScreenX,
        spawnScreenY - SPAWN_ZONE_SIZE / 2 - 10
      );
    }
  }, []);

  const renderFoods = useCallback((ctx: CanvasRenderingContext2D) => {
    const currentFoods = useGameStore.getState().foods;

    currentFoods.forEach((food) => {
      const screenX = food.position.x - worldRef.current.x;
      const screenY = food.position.y - worldRef.current.y;

      if (
        screenX > -50 &&
        screenX < SCREEN_SIZE.width + 50 &&
        screenY > -50 &&
        screenY < SCREEN_SIZE.height + 50
      ) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = food.token.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(screenX, screenY, 2, 0, 2 * Math.PI);
        ctx.fill();

        // 충돌 체크
        if (localPlayerRef.current) {
          const centerX = SCREEN_SIZE.width / 2;
          const centerY = SCREEN_SIZE.height / 2;
          if (
            GameUtils.circleCollision(
              centerX,
              centerY,
              localPlayerRef.current.size + 3,
              screenX,
              screenY,
              5
            )
          ) {
            socketService.eatFood(food.id);
          }
        }
      }
    });

    ctx.globalAlpha = 1;
  }, []);

  const renderOtherPlayers = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const allPlayers = useGameStore.getState().players;
      const visiblePlayers: Player[] = [];

      // 화면에 보이는 플레이어 필터링
      allPlayers.forEach((otherPlayer) => {
        if (otherPlayer.id === currentPlayer?.id || !otherPlayer.alive) return;

        const screenX =
          SCREEN_SIZE.width - otherPlayer.position.x - worldRef.current.x;
        const screenY =
          SCREEN_SIZE.height - otherPlayer.position.y - worldRef.current.y;

        const margin = 100;
        if (
          screenX >= -margin &&
          screenX <= SCREEN_SIZE.width + margin &&
          screenY >= -margin &&
          screenY <= SCREEN_SIZE.height + margin
        ) {
          visiblePlayers.push(otherPlayer);
        }
      });

      // 최대 50명까지만 렌더링
      visiblePlayers.slice(0, MAX_VISIBLE_PLAYERS).forEach((otherPlayer) => {
        // 보간 사용 (useOtherPlayers 훅)
        const current = interpolate(otherPlayer.id, LERP_FACTOR);

        if (current) {
          otherPlayer.position.x = current.position.x;
          otherPlayer.position.y = current.position.y;
          otherPlayer.angle = current.angle;
        }

        const screenX =
          SCREEN_SIZE.width - otherPlayer.position.x - worldRef.current.x;
        const screenY =
          SCREEN_SIZE.height - otherPlayer.position.y - worldRef.current.y;

        // bodyParts 업데이트
        let bodyParts = bodyPartsRef.current.get(otherPlayer.id) || [];
        const angle = otherPlayer.angle || 0;
        const sizeBonus = Math.floor(
          otherPlayer.length / SIZE_INCREASE_INTERVAL
        );
        const finalSize = Math.min(
          BASE_SIZE + sizeBonus * SIZE_INCREMENT,
          MAX_SIZE
        );
        const d = finalSize / 2;

        if (bodyParts.length > 0) {
          bodyParts[0].x = screenX - d * Math.cos(angle);
          bodyParts[0].y = screenY - d * Math.sin(angle);
        }

        for (let i = 1; i < bodyParts.length; i++) {
          bodyParts[i].x = bodyParts[i - 1].x - d * Math.cos(angle);
          bodyParts[i].y = bodyParts[i - 1].y - d * Math.sin(angle);
        }

        // 색상 가져오기
        const colors: SnakeColors = colorsRef.current.get(otherPlayer.id) || {
          mainColor: "#FF6B6B",
          midColor: "#FF8E8E",
          supportColor: "#FFB3B3",
        };

        // SnakeRenderer 사용
        SnakeRenderer.drawSnake(
          ctx,
          bodyParts,
          screenX,
          screenY,
          angle,
          finalSize,
          colors,
          otherPlayer.name
        );
      });

      ctx.globalAlpha = 1;
    },
    [currentPlayer?.id, interpolate, bodyPartsRef, colorsRef]
  );

  // 6. 메인 렌더링 함수
  const renderGame = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, SCREEN_SIZE.width, SCREEN_SIZE.height);

    BackgroundRenderer.drawBackground(
      ctx,
      backgroundPatternRef.current,
      backgroundImageRef.current,
      worldRef.current
    );
    updatePlayerMovement();
    renderSafeZone(ctx);
    renderFoods(ctx);

    if (localPlayerRef.current) {
      const colors: SnakeColors = {
        mainColor: localPlayerRef.current.mainColor,
        midColor: localPlayerRef.current.midColor,
        supportColor: localPlayerRef.current.supportColor,
      };

      SnakeRenderer.drawSnake(
        ctx,
        localPlayerRef.current.bodyParts,
        SCREEN_SIZE.width / 2,
        SCREEN_SIZE.height / 2,
        angleRef.current,
        localPlayerRef.current.size,
        colors,
        localPlayerRef.current.name
      );
    }

    renderOtherPlayers(ctx);

    MinimapRenderer.draw(ctx, localPlayerRef.current, worldRef.current);
  }, [updatePlayerMovement, renderSafeZone, renderFoods, renderOtherPlayers]);

  // 7. 게임 루프 (useGameLoop 훅 사용)
  useGameLoop({
    enabled: !!localPlayer,
    onUpdate: renderGame,
  });

  // 8. 이벤트 리스너
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !localPlayer) return;

    // 마우스 이동
    const handleMouseMove = (e: MouseEvent) => {
      const pos = GameUtils.getMousePos(canvas, e);
      const centerX = SCREEN_SIZE.width / 2;
      const centerY = SCREEN_SIZE.height / 2;
      angleRef.current = GameUtils.getAngle({ x: centerX, y: centerY }, pos);
    };

    // 키보드 (일시정지)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        setIsPaused((prev) => {
          const newPaused = !prev;
          isPausedRef.current = newPaused;
          return newPaused;
        });
      }
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [localPlayer]);

  return (
    <div className="game-canvas-container">
      <canvas
        ref={canvasRef}
        width={SCREEN_SIZE.width}
        height={SCREEN_SIZE.height}
        className="game-canvas"
      />
      {!localPlayer && (
        <div
          style={{
            position: "absolute",
            color: "white",
            fontSize: "20px",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          Loading game...
        </div>
      )}
    </div>
  );
};
