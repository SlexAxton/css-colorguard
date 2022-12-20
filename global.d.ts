import type { Declaration } from 'postcss';
export {};

declare global {
  type Options = {
    whitelist?: string[][];
    allowEquivalentNotation?: boolean;
    ignore?: string[];
    threshold?: number;
  };

  type Colors = {
    [key: string]: Matches[];
  };

  type WhitelistHash = {
    [key: string]: boolean;
  }

  type Matches = {
    declaration?: Declaration;
    index: number;
    line: number;
    column: number;
    match: string;
    color: Color;
  };

  type Color = [number, number, number, number];
}
