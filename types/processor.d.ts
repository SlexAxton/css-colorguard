import type { Declaration } from 'postcss';

export type Colors = {
  [key: string]: Matches[];
};

export type WhitelistHash = {
  [key: string]: boolean;
};

export type Matches = {
  declaration?: Declaration;
  index: number;
  line: number;
  column: number;
  match: string;
  color: Color;
};

export type Color = [number, number, number, number];
