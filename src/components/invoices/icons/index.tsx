import React from 'react';
import { Svg, Path, G } from '@react-pdf/renderer';
import { GLYPHS, type GlyphName } from './glyphs';

/** A Phosphor icon (same set as the app) drawn as a PDF vector. Glyphs are y-up, so flip them. */
export const Icon = ({ name, color, size = 10 }: { name: GlyphName; color: string; size?: number }) => (
  <Svg viewBox="0 0 1024 1024" width={size} height={size}>
    <G transform="matrix(1 0 0 -1 0 960)">
      <Path d={GLYPHS[name]} fill={color} />
    </G>
  </Svg>
);
