export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Transform extends Position, Size {
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
} 