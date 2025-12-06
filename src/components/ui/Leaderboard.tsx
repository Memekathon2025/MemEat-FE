import React from "react";
import type { LeaderboardEntry } from "../../types";
import "../../styles/Leaderboard.css";

interface LeaderboardProps {
  leaderboard: LeaderboardEntry[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ leaderboard }) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="leaderboard">
      <h3 className="leaderboard-title">🏆 Live Leaderboard</h3>
      <div className="leaderboard-content">
        {leaderboard.length === 0 ? (
          <p className="no-players">No players yet</p>
        ) : (
          <ol className="leaderboard-list">
            {leaderboard.map((entry, index) => (
              <li
                key={`${entry.name}-${index}`}
                className={`leaderboard-item rank-${index + 1}`}
              >
                <span className="rank">#{index + 1}</span>
                <div className="player-info">
                  <span className="player-name">{entry.name}</span>
                  <span className="player-stats">
                    EATEN: {entry.score.toFixed(2)}
                    <br />
                    TIME: {formatTime(entry.survivalTime)}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};
