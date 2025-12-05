import { useEffect, useRef } from "react";
import { FPS } from "../components/game/constants";

interface GameLoopOptions {
  onUpdate: (deltaTime: number) => void;
  enabled: boolean;
}

export const useGameLoop = ({ onUpdate, enabled }: GameLoopOptions) => {
  const animationIdRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) return;

    const gameLoop = () => {
      const now = Date.now();
      const delta = now - lastUpdateRef.current;

      if (delta > 1000 / FPS) {
        lastUpdateRef.current = now;
        onUpdate(delta);
      }

      animationIdRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [enabled, onUpdate]);
};
