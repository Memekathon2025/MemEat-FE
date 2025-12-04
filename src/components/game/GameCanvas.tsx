import React, { useEffect, useRef, useState } from "react";
import { socketService } from "../../services/socket";
import { useGameStore } from "../../store/gameStore";
import type { Player, Point } from "../../types";
import { GameUtils } from "./utils";

import "../../styles/GameCanvas.css";
import backgroundImage from "../../assets/background.jpg";

interface GameCanvasProps {
  onGameOver: (success: boolean) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundPatternRef = useRef<CanvasPattern | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);

  const {
    currentPlayer,
    setCurrentPlayer,
    foods,
    setFoods,
    removeFood,
    players,
    setPlayers,
    canEscape,
  } = useGameStore();

  const [localPlayer, setLocalPlayer] = useState<any>(null);
  const localPlayerRef = useRef<any>(null);
  const worldRef = useRef<Point>({ x: -1200, y: -600 });
  const velocityRef = useRef<Point>({ x: 0, y: 0 });
  const angleRef = useRef<number>(0);
  const animationIdRef = useRef<number>(0);

  const WORLD_SIZE = { width: 4000, height: 2000 };
  const SCREEN_SIZE = { width: 1000, height: 800 };

  // Initialize player once when currentPlayer is set
  useEffect(() => {
    if (!currentPlayer) return;

    console.log("Initializing player:", currentPlayer);

    const player = {
      ...currentPlayer,
      bodyParts: Array(currentPlayer.length)
        .fill(null)
        .map(() => ({
          x: SCREEN_SIZE.width / 2,
          y: SCREEN_SIZE.height / 2,
        })),
      size: 7,
      force: 5,
      mainColor: GameUtils.randomColor(),
      midColor: "",
      supportColor: "",
    };
    player.midColor = GameUtils.adjustLuminosity(player.mainColor, 0.33);
    player.supportColor = GameUtils.adjustLuminosity(player.midColor, 0.33);

    setLocalPlayer(player);
    localPlayerRef.current = player;
  }, [currentPlayer?.id]); // Only re-run when player ID changes

  // Setup socket listeners
  useEffect(() => {
    console.log("Setting up socket listeners");

    socketService.onGameState((state) => {
      console.log("Game state:", state);
      // console.log("🍎 Foods in state:", state.foods?.length || 0, state.foods);
      setPlayers(state.players);
      setFoods(state.foods);
    });

    socketService.onFoodEaten((data) => {
      removeFood(data.foodId);
    });

    socketService.onPlayerUpdated((updatedPlayer) => {
      if (currentPlayer && updatedPlayer.id === currentPlayer.id) {
        setCurrentPlayer(updatedPlayer);
        setLocalPlayer((prev: any) => {
          if (!prev) return prev;

          // 길이가 늘어났으면 bodyParts에 새 세그먼트 추가
          const newBodyParts = [...prev.bodyParts];
          const oldLength = newBodyParts.length;

          while (newBodyParts.length < updatedPlayer.length) {
            const lastPart = newBodyParts[newBodyParts.length - 1];
            newBodyParts.push({ x: lastPart.x, y: lastPart.y });
          }

          // ✅ 길이에 따라 사이즈 증가 (30의 배수마다)
          let newSize = 7;
          const MAXSIZE = 20;
          // 30마다 1씩 증가
          const sizeBonus = Math.floor(updatedPlayer.length / 30);
          newSize = 7 + sizeBonus * 1.5; // ✅ 1.5씩 증가 (더 눈에 띄게)

          if (newSize > MAXSIZE) newSize = MAXSIZE;

          if (sizeBonus > Math.floor(prev.length / 30)) {
            console.log(
              `📏 Size increased to ${newSize}! (Length: ${updatedPlayer.length})`
            );
          }

          const updated = {
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
  }, [currentPlayer?.id]);

  // Load background image
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

  // Setup canvas and game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !localPlayer) {
      console.log("Canvas or localPlayer not ready", {
        canvas: !!canvas,
        localPlayer: !!localPlayer,
      });
      return;
    }

    console.log("Starting game loop");

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleMouseMove = (e: MouseEvent) => {
      const pos = GameUtils.getMousePos(canvas, e);
      const centerX = SCREEN_SIZE.width / 2;
      const centerY = SCREEN_SIZE.height / 2;
      const angle = GameUtils.getAngle({ x: centerX, y: centerY }, pos);
      angleRef.current = angle;
    };

    canvas.addEventListener("mousemove", handleMouseMove);

    let lastUpdate = Date.now();

    const gameLoop = () => {
      const now = Date.now();
      const delta = now - lastUpdate;

      if (delta > 1000 / 30) {
        lastUpdate = now;

        // Clear canvas
        ctx.clearRect(0, 0, SCREEN_SIZE.width, SCREEN_SIZE.height);

        // Draw world background with tiled image
        if (backgroundPatternRef.current && backgroundImageRef.current) {
          ctx.save();

          // 월드 오프셋에 맞춰 패턴 위치 조정
          const imgWidth = backgroundImageRef.current.width;
          const imgHeight = backgroundImageRef.current.height;

          const patternOffsetX =
            ((worldRef.current.x % imgWidth) + imgWidth) % imgWidth;
          const patternOffsetY =
            ((worldRef.current.y % imgHeight) + imgHeight) % imgHeight;

          ctx.fillStyle = backgroundPatternRef.current;
          ctx.translate(-patternOffsetX, -patternOffsetY);
          ctx.fillRect(
            -patternOffsetX,
            -patternOffsetY,
            SCREEN_SIZE.width + imgWidth * 2,
            SCREEN_SIZE.height + imgHeight * 2
          );

          // Restore context state
          ctx.restore();
        } else {
          // Fallback to solid color if image not loaded
          ctx.fillStyle = "#90c542";
          ctx.fillRect(0, 0, SCREEN_SIZE.width, SCREEN_SIZE.height);
        }

        // Draw world background
        // ctx.fillStyle = "#17202A";
        // ctx.fillRect(0, 0, SCREEN_SIZE.width, SCREEN_SIZE.height);

        const playerRef = localPlayerRef.current; // 👈 이 줄 추가 - 매 프레임 최신 값 사용

        if (playerRef) {
          // Update velocity
          velocityRef.current = {
            x: playerRef.force * Math.cos(angleRef.current),
            y: playerRef.force * Math.sin(angleRef.current),
          };

          // Update world offset
          worldRef.current = {
            x: worldRef.current.x + velocityRef.current.x,
            y: worldRef.current.y + velocityRef.current.y,
          };

          // Update body parts - 뱀이 따라오도록
          const d = playerRef.size / 2;

          // 각 bodyPart를 현재 각도 기준으로 배치
          for (let i = playerRef.bodyParts.length - 1; i >= 1; i--) {
            playerRef.bodyParts[i].x =
              playerRef.bodyParts[i - 1].x - d * Math.cos(angleRef.current);
            playerRef.bodyParts[i].y =
              playerRef.bodyParts[i - 1].y - d * Math.sin(angleRef.current);
          }

          // 첫 번째 bodyPart는 머리(중앙) 기준으로 배치
          if (playerRef.bodyParts.length > 0) {
            const headX = SCREEN_SIZE.width / 2;
            const headY = SCREEN_SIZE.height / 2;

            playerRef.bodyParts[0].x = headX - d * Math.cos(angleRef.current);
            playerRef.bodyParts[0].y = headY - d * Math.sin(angleRef.current);
          }

          // Get latest foods from store
          const currentFoods = useGameStore.getState().foods;

          // console.log(
          //   `🍎 Foods count: ${currentFoods.length}`,
          //   currentFoods[0]
          // );

          // Draw foods
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

              // Check collision
              const centerX = SCREEN_SIZE.width / 2;
              const centerY = SCREEN_SIZE.height / 2;
              if (
                GameUtils.circleCollision(
                  centerX,
                  centerY,
                  playerRef.size + 3,
                  screenX,
                  screenY,
                  5
                )
              ) {
                socketService.eatFood(food.id);
              }
            }
          });

          // Draw local player
          drawSnake(ctx, playerRef);

          // Draw minimap
          drawMinimap(ctx, playerRef);

          // Update server with position
          socketService.updatePosition({
            x: -worldRef.current.x + SCREEN_SIZE.width / 2,
            y: -worldRef.current.y + SCREEN_SIZE.height / 2,
            angle: angleRef.current,
          });
        }
      }

      animationIdRef.current = requestAnimationFrame(gameLoop);

      // 다른 플레이어들 렌더링 (최적화 버전)
      const allPlayers = useGameStore.getState().players;
      const visiblePlayers: Player[] = [];

      // 1️⃣ 화면에 보이는 플레이어만 필터링
      allPlayers.forEach((otherPlayer) => {
        if (otherPlayer.id === currentPlayer?.id) return;
        if (!otherPlayer.alive) return;

        const screenX = otherPlayer.position.x - worldRef.current.x;
        const screenY = otherPlayer.position.y - worldRef.current.y;

        // 화면 밖 플레이어는 건너뛰기 (마진 포함)
        const margin = 100;
        if (
          screenX < -margin ||
          screenX > SCREEN_SIZE.width + margin ||
          screenY < -margin ||
          screenY > SCREEN_SIZE.height + margin
        ) {
          return;
        }

        visiblePlayers.push(otherPlayer);
      });

      // 2️⃣ 보이는 플레이어만 렌더링 (최대 50명까지만)
      const maxVisible = 50;
      visiblePlayers.slice(0, maxVisible).forEach((otherPlayer) => {
        const screenX = otherPlayer.position.x - worldRef.current.x;
        const screenY = otherPlayer.position.y - worldRef.current.y;

        // 플레이어 크기 계산 (점수 기반)
        const otherSize = 7 + Math.floor(otherPlayer.length / 30);

        // 간단한 원으로 그리기 (머리)
        ctx.fillStyle = "#FF6B6B";
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(screenX, screenY, otherSize, 0, 2 * Math.PI);
        ctx.fill();

        // 이름 표시
        ctx.globalAlpha = 1;
        ctx.fillStyle = "white";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.fillText(otherPlayer.name, screenX, screenY - otherSize - 5);
      });

      ctx.globalAlpha = 1; // 알파 리셋
    };

    gameLoop();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, [localPlayer?.id, currentPlayer?.id]); // Run when localPlayer is ready

  // 뱀 버전
  const drawSnake = (ctx: CanvasRenderingContext2D, snake: any) => {
    const centerX = SCREEN_SIZE.width / 2;
    const centerY = SCREEN_SIZE.height / 2;
    const angle = angleRef.current;

    // Draw body
    for (let i = snake.bodyParts.length - 1; i >= 0; i--) {
      const part = snake.bodyParts[i];
      // ✅ 뒤로 갈수록 점점 작아지는 효과 (더 자연스럽게)
      const sizeRatio = 1 - (i / snake.bodyParts.length) * 0.3; // 최대 30% 작아짐
      const radius = snake.size * sizeRatio;

      const grd = ctx.createRadialGradient(
        part.x,
        part.y,
        2,
        part.x + 4,
        part.y + 4,
        10
      );
      grd.addColorStop(0, snake.supportColor);
      grd.addColorStop(1, snake.midColor);

      ctx.fillStyle = snake.mainColor;
      ctx.beginPath();
      ctx.arc(part.x, part.y, radius + 1, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(part.x, part.y, radius, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw head
    const headSize = snake.size * 1.03; // ✅ 머리를 좀 더 크게
    const grd = ctx.createRadialGradient(
      centerX,
      centerY,
      2,
      centerX + 4,
      centerY + 4,
      10
    );
    grd.addColorStop(0, snake.supportColor);
    grd.addColorStop(1, snake.midColor);

    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(centerX, centerY, headSize + 1, 0, 2 * Math.PI);
    ctx.fill();

    // 더듬이 그리기 (2개) - 머리 앞쪽
    const antennaLength = snake.size * 1.8;
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

      // 더듬이 끝 (작은 원)
      ctx.fillStyle = antennaColor;
      ctx.beginPath();
      ctx.arc(antennaEndX, antennaEndY, 2, 0, 2 * Math.PI);
      ctx.fill();
    }

    // 다리 그리기 - 몸체 부분에 여러 개
    const legLength = snake.size * 1.5;
    const legWidth = 2;
    const legColor = "#000";

    // bodyParts의 일부 위치에 다리 배치 (앞쪽부터)
    const legCount = Math.min(6, Math.floor(snake.bodyParts.length / 3));
    for (let i = 0; i < legCount; i++) {
      const partIndex = Math.floor((i / legCount) * snake.bodyParts.length);
      if (partIndex >= snake.bodyParts.length) continue;

      const part = snake.bodyParts[partIndex];
      const partSize =
        snake.size * (1 - (partIndex / snake.bodyParts.length) * 0.3);

      // 각 bodyPart에 양쪽 다리 2개씩
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

    // Draw eyes
    const eyeDistance = headSize / 2;
    const eyeAngle = Math.PI / 6;

    const eye1 = {
      x: centerX + eyeDistance * 2 * Math.cos(angleRef.current + eyeAngle),
      y: centerY + eyeDistance * 2 * Math.sin(angleRef.current + eyeAngle),
    };
    const eye2 = {
      x: centerX + eyeDistance * 2 * Math.cos(angleRef.current - eyeAngle),
      y: centerY + eyeDistance * 2 * Math.sin(angleRef.current - eyeAngle),
    };

    // Eye 1
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(eye1.x, eye1.y, snake.size / 2, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = "whitesmoke";
    ctx.beginPath();
    ctx.arc(
      eye1.x + Math.cos(angleRef.current),
      eye1.y + Math.sin(angleRef.current),
      snake.size / 4,
      0,
      2 * Math.PI
    );
    ctx.fill();

    // Eye 2
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(eye2.x, eye2.y, snake.size / 2, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = "whitesmoke";
    ctx.beginPath();
    ctx.arc(
      eye2.x + Math.cos(angleRef.current),
      eye2.y + Math.sin(angleRef.current),
      snake.size / 4,
      0,
      2 * Math.PI
    );
    ctx.fill();

    // Draw name
    ctx.fillStyle = "whitesmoke";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(snake.name, centerX, centerY - snake.size - 10);
  };

  // 개미 버전
  // const drawSnake = (ctx: CanvasRenderingContext2D, snake: any) => {
  //   const centerX = SCREEN_SIZE.width / 2;
  //   const centerY = SCREEN_SIZE.height / 2;
  //   const angle = angleRef.current;

  //   // 개미 색상 (갈색 계열)
  //   const antColor = snake.mainColor || "#8B4513";
  //   const antDarkColor = snake.midColor || "#654321";
  //   const antLightColor = snake.supportColor || "#A0522D";

  //   // 1. 머리 그리기 (가장 앞)
  //   const headSize = snake.size * 1.2;
  //   const headGrd = ctx.createRadialGradient(
  //     centerX,
  //     centerY,
  //     0,
  //     centerX,
  //     centerY,
  //     headSize
  //   );
  //   headGrd.addColorStop(0, antLightColor);
  //   headGrd.addColorStop(1, antDarkColor);

  //   ctx.fillStyle = headGrd;
  //   ctx.beginPath();
  //   ctx.arc(centerX, centerY, headSize, 0, 2 * Math.PI);
  //   ctx.fill();

  //   // 머리 테두리
  //   ctx.strokeStyle = "#000";
  //   ctx.lineWidth = 1;
  //   ctx.stroke();

  //   // 2. 가슴 그리기 (머리 뒤)
  //   const thoraxSize = snake.size * 0.9;
  //   const thoraxX = centerX - headSize * 1.5 * Math.cos(angle);
  //   const thoraxY = centerY - headSize * 1.5 * Math.sin(angle);

  //   const thoraxGrd = ctx.createRadialGradient(
  //     thoraxX,
  //     thoraxY,
  //     0,
  //     thoraxX,
  //     thoraxY,
  //     thoraxSize
  //   );
  //   thoraxGrd.addColorStop(0, antLightColor);
  //   thoraxGrd.addColorStop(1, antDarkColor);

  //   ctx.fillStyle = thoraxGrd;
  //   ctx.beginPath();
  //   ctx.arc(thoraxX, thoraxY, thoraxSize, 0, 2 * Math.PI);
  //   ctx.fill();
  //   ctx.stroke();

  //   // 3. 배 그리기 (가슴 뒤, 여러 마디)
  //   const abdomenSegments = Math.max(3, Math.floor(snake.bodyParts.length / 5));
  //   const segmentSize = snake.size * 0.7;
  //   const segmentSpacing = segmentSize * 1.3;

  //   // 마지막 배 마디 위치 저장 (다리 그리기용)
  //   let lastAbdomenX = 0;
  //   let lastAbdomenY = 0;

  //   for (let i = 0; i < abdomenSegments; i++) {
  //     const segmentX =
  //       thoraxX - (thoraxSize + segmentSpacing * (i + 0.5)) * Math.cos(angle);
  //     const segmentY =
  //       thoraxY - (thoraxSize + segmentSpacing * (i + 0.5)) * Math.sin(angle);

  //     // ✅ 크기 그대로 유지 (작아지는 효과 제거)
  //     const currentSegmentSize = segmentSize;

  //     const segmentGrd = ctx.createRadialGradient(
  //       segmentX,
  //       segmentY,
  //       0,
  //       segmentX,
  //       segmentY,
  //       currentSegmentSize
  //     );
  //     segmentGrd.addColorStop(0, antLightColor);
  //     segmentGrd.addColorStop(1, antDarkColor);

  //     ctx.fillStyle = segmentGrd;
  //     ctx.beginPath();
  //     ctx.arc(segmentX, segmentY, currentSegmentSize, 0, 2 * Math.PI);
  //     ctx.fill();
  //     ctx.stroke();

  //     // 마지막 마디 위치 저장
  //     if (i === abdomenSegments - 1) {
  //       lastAbdomenX = segmentX;
  //       lastAbdomenY = segmentY;
  //     }
  //   }

  //   // 4. 다리 그리기 (6개)
  //   const legLength = snake.size * 1.5;
  //   const legWidth = 2;
  //   const legColor = "#000"; // ✅ 테두리 색상과 동일

  //   // 머리 다리 2개
  //   for (let side = -1; side <= 1; side += 2) {
  //     const legAngle = angle + (Math.PI / 3) * side;
  //     const legStartX =
  //       centerX + headSize * 0.7 * Math.cos(angle + (Math.PI / 2) * side);
  //     const legStartY =
  //       centerY + headSize * 0.7 * Math.sin(angle + (Math.PI / 2) * side);
  //     const legEndX = legStartX + legLength * Math.cos(legAngle);
  //     const legEndY = legStartY + legLength * Math.sin(legAngle);

  //     ctx.strokeStyle = legColor; // ✅ 테두리 색상
  //     ctx.lineWidth = legWidth;
  //     ctx.beginPath();
  //     ctx.moveTo(legStartX, legStartY);
  //     ctx.lineTo(legEndX, legEndY);
  //     ctx.stroke();
  //   }

  //   // 가슴 다리 2개
  //   for (let side = -1; side <= 1; side += 2) {
  //     const legAngle = angle + (Math.PI / 3) * side;
  //     const legStartX =
  //       thoraxX + thoraxSize * 0.7 * Math.cos(angle + (Math.PI / 2) * side);
  //     const legStartY =
  //       thoraxY + thoraxSize * 0.7 * Math.sin(angle + (Math.PI / 2) * side);
  //     const legEndX = legStartX + legLength * Math.cos(legAngle);
  //     const legEndY = legStartY + legLength * Math.sin(legAngle);

  //     ctx.strokeStyle = legColor; // ✅ 테두리 색상
  //     ctx.lineWidth = legWidth;
  //     ctx.beginPath();
  //     ctx.moveTo(legStartX, legStartY);
  //     ctx.lineTo(legEndX, legEndY);
  //     ctx.stroke();
  //   }

  //   // 배 다리 2개 (첫 번째 마디)
  //   const firstAbdomenX =
  //     thoraxX - (thoraxSize + segmentSpacing * 0.5) * Math.cos(angle);
  //   const firstAbdomenY =
  //     thoraxY - (thoraxSize + segmentSpacing * 0.5) * Math.sin(angle);
  //   for (let side = -1; side <= 1; side += 2) {
  //     const legAngle = angle + (Math.PI / 3) * side;
  //     const legStartX =
  //       firstAbdomenX +
  //       segmentSize * 0.7 * Math.cos(angle + (Math.PI / 2) * side);
  //     const legStartY =
  //       firstAbdomenY +
  //       segmentSize * 0.7 * Math.sin(angle + (Math.PI / 2) * side);
  //     const legEndX = legStartX + legLength * Math.cos(legAngle);
  //     const legEndY = legStartY + legLength * Math.sin(legAngle);

  //     ctx.strokeStyle = legColor; // ✅ 테두리 색상
  //     ctx.lineWidth = legWidth;
  //     ctx.beginPath();
  //     ctx.moveTo(legStartX, legStartY);
  //     ctx.lineTo(legEndX, legEndY);
  //     ctx.stroke();
  //   }

  //   // ✅ 마지막 배 마디에 다리 2개 추가
  //   if (abdomenSegments > 0) {
  //     for (let side = -1; side <= 1; side += 2) {
  //       const legAngle = angle + (Math.PI / 3) * side;
  //       const legStartX =
  //         lastAbdomenX +
  //         segmentSize * 0.7 * Math.cos(angle + (Math.PI / 2) * side);
  //       const legStartY =
  //         lastAbdomenY +
  //         segmentSize * 0.7 * Math.sin(angle + (Math.PI / 2) * side);
  //       const legEndX = legStartX + legLength * Math.cos(legAngle);
  //       const legEndY = legStartY + legLength * Math.sin(legAngle);

  //       ctx.strokeStyle = legColor; // ✅ 테두리 색상
  //       ctx.lineWidth = legWidth;
  //       ctx.beginPath();
  //       ctx.moveTo(legStartX, legStartY);
  //       ctx.lineTo(legEndX, legEndY);
  //       ctx.stroke();
  //     }
  //   }

  //   // 5. 더듬이 그리기 (2개)
  //   const antennaLength = snake.size * 1.8;
  //   const antennaWidth = 1.5;
  //   const antennaColor = "#000"; // ✅ 테두리 색상과 동일

  //   for (let side = -1; side <= 1; side += 2) {
  //     const antennaAngle = angle + (Math.PI / 4) * side;
  //     const antennaStartX = centerX + headSize * 0.8 * Math.cos(angle);
  //     const antennaStartY = centerY + headSize * 0.8 * Math.sin(angle);
  //     const antennaEndX =
  //       antennaStartX + antennaLength * Math.cos(antennaAngle);
  //     const antennaEndY =
  //       antennaStartY + antennaLength * Math.sin(antennaAngle);

  //     ctx.strokeStyle = antennaColor;
  //     ctx.lineWidth = antennaWidth;
  //     ctx.beginPath();
  //     ctx.moveTo(antennaStartX, antennaStartY);
  //     ctx.lineTo(antennaEndX, antennaEndY);
  //     ctx.stroke();

  //     // 더듬이 끝 (작은 원)
  //     ctx.fillStyle = antennaColor;
  //     ctx.beginPath();
  //     ctx.arc(antennaEndX, antennaEndY, 2, 0, 2 * Math.PI);
  //     ctx.fill();
  //   }

  //   // Draw eyes
  //   const eyeDistance = headSize / 2;
  //   const eyeAngle = Math.PI / 6;

  //   const eye1 = {
  //     x: centerX + eyeDistance * 2 * Math.cos(angleRef.current + eyeAngle),
  //     y: centerY + eyeDistance * 2 * Math.sin(angleRef.current + eyeAngle),
  //   };
  //   const eye2 = {
  //     x: centerX + eyeDistance * 2 * Math.cos(angleRef.current - eyeAngle),
  //     y: centerY + eyeDistance * 2 * Math.sin(angleRef.current - eyeAngle),
  //   };

  //   // Eye 1
  //   ctx.fillStyle = "black";
  //   ctx.beginPath();
  //   ctx.arc(eye1.x, eye1.y, snake.size / 2, 0, 2 * Math.PI);
  //   ctx.fill();

  //   ctx.fillStyle = "whitesmoke";
  //   ctx.beginPath();
  //   ctx.arc(
  //     eye1.x + Math.cos(angleRef.current),
  //     eye1.y + Math.sin(angleRef.current),
  //     snake.size / 4,
  //     0,
  //     2 * Math.PI
  //   );
  //   ctx.fill();

  //   // Eye 2
  //   ctx.fillStyle = "black";
  //   ctx.beginPath();
  //   ctx.arc(eye2.x, eye2.y, snake.size / 2, 0, 2 * Math.PI);
  //   ctx.fill();

  //   ctx.fillStyle = "whitesmoke";
  //   ctx.beginPath();
  //   ctx.arc(
  //     eye2.x + Math.cos(angleRef.current),
  //     eye2.y + Math.sin(angleRef.current),
  //     snake.size / 4,
  //     0,
  //     2 * Math.PI
  //   );
  //   ctx.fill();

  //   // 7. 이름 표시
  //   ctx.fillStyle = "whitesmoke";
  //   ctx.font = "12px Arial";
  //   ctx.textAlign = "center";
  //   ctx.fillText(snake.name, centerX, centerY - headSize - 15);
  // };

  const drawMinimap = (ctx: CanvasRenderingContext2D, playerRef: any) => {
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
      const worldX = worldRef.current.x + SCREEN_SIZE.width / 2;
      const worldY = worldRef.current.y + SCREEN_SIZE.height / 2;

      // 월드 좌표를 미니맵 좌표로 변환 (오프셋 보정)
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
  };

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
