import { useRef, useCallback } from "react";
import { GameUtils } from "../components/game/utils";
import type { Player } from "../types";

interface OtherPlayerData {
  position: { x: number; y: number };
  angle: number;
}

export const useOtherPlayers = () => {
  const bodyPartsRef = useRef<Map<string, { x: number; y: number }[]>>(
    new Map()
  );
  const colorsRef = useRef<Map<string, any>>(new Map());
  const targetRef = useRef<Map<string, any>>(new Map());
  const currentRef = useRef<Map<string, OtherPlayerData>>(new Map());

  const initializePlayer = useCallback((player: Player) => {
    if (!bodyPartsRef.current.has(player.id)) {
      const bodyParts = Array(player.length || 1)
        .fill(null)
        .map(() => ({
          x: player.position?.x || 0,
          y: player.position?.y || 0,
        }));
      bodyPartsRef.current.set(player.id, bodyParts);

      const mainColor = GameUtils.randomColor();
      const midColor = GameUtils.adjustLuminosity(mainColor, 0.33);
      const supportColor = GameUtils.adjustLuminosity(midColor, 0.33);
      colorsRef.current.set(player.id, { mainColor, midColor, supportColor });
    }
  }, []);

  const updateTarget = useCallback(
    (playerId: string, position: any, angle: number) => {
      targetRef.current.set(playerId, {
        position,
        angle,
        timestamp: Date.now(),
      });

      if (!currentRef.current.has(playerId)) {
        currentRef.current.set(playerId, { position, angle });
      }
    },
    []
  );

  const interpolate = useCallback(
    (playerId: string, lerpFactor: number = 0.2) => {
      const target = targetRef.current.get(playerId);
      const current = currentRef.current.get(playerId);

      if (target && current) {
        current.position.x +=
          (target.position.x - current.position.x) * lerpFactor;
        current.position.y +=
          (target.position.y - current.position.y) * lerpFactor;

        let angleDiff = target.angle - current.angle;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        current.angle += angleDiff * lerpFactor;
      }

      return current;
    },
    []
  );

  return {
    bodyPartsRef,
    colorsRef,
    initializePlayer,
    updateTarget,
    interpolate,
  };
};
