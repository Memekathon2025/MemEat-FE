export interface SnakeColors {
  mainColor: string;
  midColor: string;
  supportColor: string;
}

export interface SnakeBodyPart {
  x: number;
  y: number;
}

export interface LocalPlayer {
  id: string;
  name: string;
  bodyParts: SnakeBodyPart[];
  size: number;
  force: number;
  mainColor: string;
  midColor: string;
  supportColor: string;
  score: number;
  length: number;
  collectedTokens: any[];
}
