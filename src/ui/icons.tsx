/**
 * Stratum icon set — monochrome SVG recreations of the Photoshop CS2 toolbox glyphs
 * and panel/menu icons (PD-3). No emoji or color icon packs anywhere in the UI.
 *
 * All glyphs are drawn in a 16x16 box and inherit `currentColor`, so the theme controls
 * their color (black on the CS2 gray chrome). Outline glyphs use stroke; solid glyphs fill.
 */
import React from 'react';

type G = React.ReactNode;

const S = 1.3; // default stroke width

// Convenience wrappers keep the glyph table compact and consistent.
const stroke = (children: G): G => (
  <g fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </g>
);
const solid = (children: G): G => <g fill="currentColor" stroke="none">{children}</g>;

export const glyphs: Record<string, G> = {
  generic: solid(<circle cx="8" cy="8" r="2.2" />),

  // ---- Selection / move ----
  move: stroke(
    <>
      <path d="M8 1.5v13M1.5 8h13" />
      <path d="M8 1.5l-2 2M8 1.5l2 2M8 14.5l-2-2M8 14.5l2-2M1.5 8l2-2M1.5 8l2 2M14.5 8l-2-2M14.5 8l-2 2" />
    </>
  ),
  marqueeRect: (
    <rect x="2" y="3.5" width="12" height="9" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 1.3" />
  ),
  marqueeEllipse: (
    <ellipse cx="8" cy="8" rx="6" ry="4.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 1.3" />
  ),
  lasso: stroke(
    <path d="M3 11c-1.6-1.2-1.8-4 .5-5.6C6 3.8 9.6 3.8 11.7 5.4c1.9 1.4 1.7 3.8.2 4.6-1.4.8-2.7-.2-2.3-1.4.3-1 1.7-1 2 0" />
  ),
  lassoPoly: stroke(
    <>
      <path d="M3 5l5-2 5 3-2 6-6 .5L3 5z" />
      <circle cx="3" cy="5" r="0.6" fill="currentColor" />
      <circle cx="8" cy="3" r="0.6" fill="currentColor" />
      <circle cx="13" cy="6" r="0.6" fill="currentColor" />
    </>
  ),
  lassoMagnet: stroke(
    <>
      <path d="M3.5 10c-1.4-1.2-1.2-3.8 1-5 2-1.1 5-1 6.6.6" />
      <path d="M11 11.5V9m3 2.5V9" />
      <path d="M11 9a1.5 1.5 0 013 0" />
    </>
  ),
  wand: stroke(
    <>
      <path d="M4 13l7-7" />
      <path d="M11.5 5.5l1.5-1.5" />
      <path d="M13 8.5l1.4.4M9 2.6l.4 1.4M13.4 3l-.9.9M5.5 4l1 .3" />
    </>
  ),
  quickSelect: stroke(
    <>
      <circle cx="6" cy="6" r="3.2" strokeDasharray="1.6 1.2" />
      <path d="M9 9l4 4" />
      <path d="M11 11l2.4-.5-.5 2.4" fill="currentColor" />
    </>
  ),
  crop: solid(
    <>
      <path d="M4 1h1.2v10.8H15V13H4z" />
      <path d="M1 4h10.8v9.8H13V4H1z" opacity="0" />
      <path d="M11 3h1.2v11H11zM2 11h12v1.2H2z" opacity="0" />
      <path d="M11.8 15h-1.2V4.2H1V3h10.8z" />
    </>
  ),
  slice: stroke(
    <>
      <path d="M2.5 13.5l7-9" />
      <path d="M9.5 4.5l3 2-1.5 3-3.5.5" fill="currentColor" />
    </>
  ),
  eyedropper: stroke(
    <>
      <path d="M10.5 3.2l2.3 2.3" />
      <path d="M11.6 2.1l2.3 2.3a1 1 0 010 1.4l-1 1-3.7-3.7 1-1a1 1 0 011.4 0z" fill="currentColor" />
      <path d="M9.2 5.1l-6 6c-.4.4-.5 1-.2 1.5.4.6 1.2.7 1.7.2l6-6" />
    </>
  ),
  colorSampler: stroke(
    <>
      <path d="M11.5 2.2l2.3 2.3a1 1 0 010 1.4l-6.6 6.6-3.7-3.7L9.7 2.2a1 1 0 011.4 0z" />
      <circle cx="4" cy="12.5" r="1.4" fill="currentColor" />
    </>
  ),
  ruler: stroke(
    <>
      <path d="M2 9l7-7 5 5-7 7z" />
      <path d="M5 5l1 1M7 3l1.5 1.5M9 7l1 1M7 9l1.5 1.5" />
    </>
  ),
  healingSpot: stroke(
    <>
      <ellipse cx="8" cy="8" rx="4.5" ry="3.5" transform="rotate(45 8 8)" />
      <path d="M6 8h4M8 6v4" />
    </>
  ),
  healing: stroke(
    <>
      <rect x="3" y="6" width="10" height="4" rx="2" transform="rotate(-30 8 8)" />
      <path d="M6.5 6.2l3 3.6" />
    </>
  ),
  patch: (
    <g>
      <path d="M3 5l4-2 6 4-2 5-6 .5z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 1.2" />
    </g>
  ),
  brush: solid(
    <path d="M13.6 2.6c.5.5.4 1.2-.2 1.9L8.8 9 7 7.2l4.5-4.6c.7-.6 1.5-.6 2.1 0zM6.4 8.1L8 9.7c-.3 1.2-1 2.4-2.3 2.9-1 .4-2.4.3-3.2 1 .3-1 .4-2.2.9-3.2.6-1.2 1.8-2 3-2.3z" />
  ),
  pencil: solid(
    <>
      <path d="M11.8 2.3l1.9 1.9-1.2 1.2-1.9-1.9z" />
      <path d="M10 4l1.9 1.9L5.4 12.4 3 13l.6-2.4z" />
    </>
  ),
  colorReplace: stroke(
    <>
      <path d="M12.8 3.2c.5.5.4 1.1-.2 1.7L9 8.5 7.5 7l3.6-3.6c.6-.6 1.2-.7 1.7-.2z" fill="currentColor" />
      <path d="M6 8c-1.6.6-2.4 2.2-3 4 1.8-.4 3.4-1.2 4-2.8" />
      <circle cx="5" cy="11" r="2.6" strokeDasharray="1.4 1.1" />
    </>
  ),
  clone: stroke(
    <>
      <rect x="6.5" y="2.5" width="3" height="2.5" fill="currentColor" />
      <path d="M5 5h6l-1 2.5H6z" fill="currentColor" />
      <path d="M7 7.5v3M9 7.5v3" />
      <rect x="5.5" y="10.5" width="5" height="3" />
    </>
  ),
  patternStamp: stroke(
    <>
      <path d="M5 5h6l-1 2.5H6z" fill="currentColor" />
      <rect x="6.5" y="2.5" width="3" height="2.5" fill="currentColor" />
      <rect x="5.5" y="9.5" width="5" height="4" />
      <path d="M6.5 11h1M8.5 11h1M6.5 12.5h1M8.5 12.5h1" />
    </>
  ),
  historyBrush: solid(
    <>
      <path d="M13.6 2.6c.5.5.4 1.2-.2 1.9L9 9 7.2 7.2l4.3-4.6c.7-.6 1.5-.6 2.1 0zM6.4 8.1L8 9.7c-.3 1.2-1 2.4-2.3 2.9-1 .4-2.4.3-3.2 1 .3-1 .4-2.2.9-3.2.6-1.2 1.8-2 3-2.3z" />
    </>
  ),
  eraser: stroke(
    <>
      <path d="M3 11l5-5 4 4-2 2H5z" fill="currentColor" />
      <path d="M8 6l3-3 3 3-3 3" />
      <path d="M5 13.5h8" />
    </>
  ),
  gradient: (
    <g>
      <rect x="2" y="3.5" width="12" height="9" fill="url(#strat-grad)" stroke="currentColor" strokeWidth="1" />
      <defs>
        <linearGradient id="strat-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
    </g>
  ),
  bucket: stroke(
    <>
      <path d="M3 6.5l5-3.5 4.5 6.5-4.7 2.8z" fill="currentColor" />
      <path d="M12.5 9.5c1 .8 1.5 1.8 1 2.6-.6.8-1.6.4-1.7-.6-.1-.7.4-1.4.7-2z" fill="currentColor" />
      <path d="M2 9l1.5-2.5" />
    </>
  ),
  blur: solid(<path d="M8 2.5C5.5 6 4 8 4 9.7A4 4 0 008 13.5 4 4 0 0012 9.7C12 8 10.5 6 8 2.5z" />),
  sharpen: stroke(
    <>
      <path d="M8 2l4 11H4z" fill="currentColor" />
    </>
  ),
  smudge: stroke(
    <>
      <path d="M5 12c0-2 1-3 2.5-3.5C9 8 9.5 7 9 6c-.4-.8.2-1.6 1-1.4.7.2 1 1 .8 2.2-.3 1.7-1.3 3-3 3.7" />
      <circle cx="5" cy="12.5" r="1" fill="currentColor" />
    </>
  ),
  dodge: stroke(
    <>
      <circle cx="6" cy="6" r="3" />
      <path d="M8.3 8.3l4 4" />
    </>
  ),
  burn: stroke(
    <>
      <path d="M9 2.5c-1.5 2-3.5 3.2-3.5 5.8A3.5 3.5 0 009 11.8c2.3 0 3.6-1.8 3.2-3.8" fill="currentColor" />
      <path d="M9 7.5c.7.4 1 1 .8 1.8" stroke="#fff" />
    </>
  ),
  sponge: stroke(
    <>
      <rect x="3" y="6" width="10" height="6" rx="2" fill="currentColor" />
      <circle cx="6" cy="9" r="0.7" fill="#fff" />
      <circle cx="9" cy="8.5" r="0.7" fill="#fff" />
      <circle cx="10.5" cy="10.5" r="0.7" fill="#fff" />
      <circle cx="6.5" cy="11" r="0.6" fill="#fff" />
    </>
  ),
  pen: stroke(
    <>
      <path d="M6 13l-2 1 1-2 5.5-8.5 2 1.5z" fill="currentColor" />
      <path d="M5 12l1.5 1" />
      <circle cx="12.3" cy="3" r="1.1" />
    </>
  ),
  addAnchor: stroke(
    <>
      <path d="M6 13l-2 1 1-2 5.5-8.5 2 1.5z" fill="currentColor" />
      <path d="M11.5 11.5h3M13 10v3" />
    </>
  ),
  deleteAnchor: stroke(
    <>
      <path d="M6 13l-2 1 1-2 5.5-8.5 2 1.5z" fill="currentColor" />
      <path d="M11.5 11.5h3" />
    </>
  ),
  convertPoint: stroke(<path d="M3 12c0-5 3-8 8-8" />),
  type: solid(<path d="M3 2.5h10V5h-1.2V4H8.6v8H10v1.2H6V12h1.4V4H4.2v1H3z" />),
  typeVertical: solid(
    <g transform="rotate(90 8 8)">
      <path d="M3 2.5h10V5h-1.2V4H8.6v8H10v1.2H6V12h1.4V4H4.2v1H3z" />
    </g>
  ),
  typeMask: (
    <g>
      <rect x="1.5" y="2.5" width="13" height="11" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1.2" />
      <path d="M5 5h6v1.4h-2.2v4.6h-1.6V6.4H5z" fill="currentColor" />
    </g>
  ),
  pathSelect: solid(<path d="M4 2l9 5.5-3.7.8 2.3 4-1.7.9-2.3-4.1L4 12z" />),
  directSelect: stroke(<path d="M4 2l9 5.5-3.7.8 2.3 4-1.7.9-2.3-4.1L4 12z" fill="none" />),
  shapeRect: solid(<rect x="2.5" y="4" width="11" height="8" />),
  shapeRounded: solid(<rect x="2.5" y="4" width="11" height="8" rx="2.5" />),
  shapeEllipse: solid(<ellipse cx="8" cy="8" rx="5.5" ry="4.2" />),
  shapeLine: stroke(<path d="M3 13L13 3" strokeWidth="1.8" />),
  shapePolygon: solid(<path d="M8 2.2l5.2 3.8-2 6.1H4.8l-2-6.1z" />),
  shapeCustom: solid(
    <path d="M8 13.2C4.5 10.5 2.5 8.6 2.5 6.4 2.5 4.8 3.7 3.6 5.2 3.6c1 0 1.9.5 2.8 1.6.9-1.1 1.8-1.6 2.8-1.6 1.5 0 2.7 1.2 2.7 2.8 0 2.2-2 4.1-5.5 6.8z" />
  ),
  hand: stroke(
    <>
      <path d="M5.5 8V4.2a1 1 0 012 0V7m0-.3V3.6a1 1 0 012 0V7m0-.5V4.4a1 1 0 012 0V8" fill="none" />
      <path d="M11.5 7.5V6a1 1 0 012 0v4.2c0 2-1.6 3.6-3.7 3.6H8.5c-1.2 0-2-.5-2.7-1.5L4 10c-.5-.8.4-1.7 1.2-1.2L6.5 9.7" fill="currentColor" stroke="currentColor" />
    </>
  ),
  zoom: stroke(
    <>
      <circle cx="6.5" cy="6.5" r="4" />
      <path d="M9.6 9.6L14 14" strokeWidth="1.8" />
      <path d="M4.5 6.5h4M6.5 4.5v4" />
    </>
  ),
  rotateView: stroke(
    <>
      <path d="M12 5a5 5 0 10.8 4" />
      <path d="M12 2.5V5h-2.5" />
    </>
  ),
  note: stroke(
    <>
      <path d="M3 3h10v7H7l-3 3v-3H3z" fill="currentColor" />
      <path d="M5 5.5h6M5 7.5h4" stroke="#fff" />
    </>
  ),

  // ---- Panel / chrome UI icons ----
  eye: stroke(
    <>
      <path d="M1.5 8S4 4 8 4s6.5 4 6.5 4-2.5 4-6.5 4S1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="1.8" fill="currentColor" />
    </>
  ),
  lock: solid(
    <>
      <rect x="3.5" y="7" width="9" height="7" rx="1" />
      <path d="M5 7V5a3 3 0 016 0v2h-1.5V5a1.5 1.5 0 00-3 0v2z" />
    </>
  ),
  lockOpen: stroke(
    <>
      <rect x="3.5" y="7" width="9" height="7" rx="1" fill="currentColor" />
      <path d="M5 7V5a3 3 0 015.8-1" />
    </>
  ),
  layerRaster: stroke(
    <>
      <rect x="2" y="3" width="12" height="10" rx="1" />
      <circle cx="5.5" cy="6" r="1.2" fill="currentColor" />
      <path d="M2.5 12l3.5-4 2.5 2.5L11 7l2.5 3" />
    </>
  ),
  layerVector: glyphsRefPen(),
  layerAdjust: (
    <g>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M8 2a6 6 0 000 12z" fill="currentColor" />
    </g>
  ),
  layerText: solid(<path d="M3.5 3h9V5.4h-1.1V4.1H8.6v7.8H10V13H6v-1.1h1.4V4.1H4.6v1.3H3.5z" />),
  layerGroup: solid(
    <>
      <path d="M2 4.5h4.5L7.8 6H14v7.5H2z" />
      <path d="M2 4.5h4.5L7.8 6H14" fill="none" stroke="#fff" strokeWidth="0.5" opacity="0" />
    </>
  ),
  layerFill: solid(<rect x="2.5" y="2.5" width="11" height="11" rx="1" />),
  trash: stroke(
    <>
      <path d="M3.5 4.5h9M6 4.5V3h4v1.5M5 4.5l.6 9h4.8l.6-9" fill="none" />
      <path d="M7 6.5v5M9 6.5v5" />
    </>
  ),
  plus: stroke(<path d="M8 3v10M3 8h10" strokeWidth="1.6" />),
  plusSquare: stroke(
    <>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1" />
      <path d="M8 5.5v5M5.5 8h5" />
    </>
  ),
  newLayer: stroke(
    <>
      <path d="M3 5.5h7v7H3z" fill="currentColor" />
      <path d="M6 3.5h7v7h-2" fill="none" />
    </>
  ),
  swap: stroke(
    <>
      <path d="M4 4h6l-1.5-1.5M4 4l1.5 1.5" />
      <path d="M12 11H6l1.5 1.5M12 11l-1.5-1.5" />
    </>
  ),
  defaultColors: (
    <g>
      <rect x="3" y="3" width="7" height="7" fill="#fff" stroke="currentColor" strokeWidth="0.8" />
      <rect x="6" y="6" width="7" height="7" fill="currentColor" stroke="currentColor" strokeWidth="0.8" />
    </g>
  ),
  quickMaskOff: stroke(
    <>
      <rect x="1.5" y="3.5" width="13" height="9" rx="0.5" />
      <circle cx="8" cy="8" r="2.5" fill="currentColor" />
    </>
  ),
  quickMaskOn: stroke(
    <>
      <rect x="1.5" y="3.5" width="13" height="9" rx="0.5" fill="currentColor" />
      <circle cx="8" cy="8" r="2.5" fill="#fff" />
    </>
  ),
  screenStandard: stroke(
    <>
      <rect x="2" y="3" width="12" height="10" rx="1" />
      <path d="M2 5.5h12" />
    </>
  ),
  screenFullMenu: stroke(
    <>
      <rect x="1.5" y="3" width="13" height="10" />
      <path d="M1.5 5.5h13" />
      <rect x="3" y="7" width="6" height="4" fill="currentColor" />
    </>
  ),
  screenFull: solid(<rect x="1.5" y="3" width="13" height="10" />),
  chevronDown: stroke(<path d="M4 6l4 4 4-4" strokeWidth="1.5" />),
  chevronRight: stroke(<path d="M6 4l4 4-4 4" strokeWidth="1.5" />),
  check: stroke(<path d="M3 8.5l3 3 7-7.5" strokeWidth="1.6" />),
  close: stroke(<path d="M4 4l8 8M12 4l-8 8" strokeWidth="1.4" />),
  collapse: stroke(<path d="M3 6l5 5 5-5" strokeWidth="1.5" />),
};

// Pen reused for the vector layer-type icon.
function glyphsRefPen(): G {
  return stroke(
    <>
      <path d="M6 13l-2 1 1-2 5.5-8.5 2 1.5z" fill="currentColor" />
      <circle cx="12.3" cy="3" r="1.1" />
    </>
  );
}

export interface IconProps {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 16, className, style, title }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    className={className}
    style={{ display: 'block', shapeRendering: 'geometricPrecision', ...style }}
    aria-hidden={title ? undefined : true}
    role={title ? 'img' : undefined}
  >
    {title ? <title>{title}</title> : null}
    {glyphs[name] ?? glyphs.generic}
  </svg>
);

// Map every registry tool id to a drawn glyph. Anything unmapped falls back to a
// clean monochrome placeholder (never an emoji).
export const TOOL_ICON: Record<string, string> = {
  move: 'move',
  rectMarquee: 'marqueeRect',
  ellipseMarquee: 'marqueeEllipse',
  singleRowMarquee: 'marqueeRect',
  singleColumnMarquee: 'marqueeRect',
  lasso: 'lasso',
  polygonalLasso: 'lassoPoly',
  magneticLasso: 'lassoMagnet',
  magicWand: 'wand',
  quickSelection: 'quickSelect',
  objectSelection: 'marqueeRect',
  crop: 'crop',
  perspectiveCrop: 'crop',
  slice: 'slice',
  sliceSelect: 'slice',
  eyedropper: 'eyedropper',
  colorSampler: 'colorSampler',
  ruler: 'ruler',
  note: 'note',
  count: 'colorSampler',
  spotHealing: 'healingSpot',
  healingBrush: 'healing',
  patch: 'patch',
  contentAwareMove: 'move',
  redEye: 'healingSpot',
  cloneStamp: 'clone',
  patternStamp: 'patternStamp',
  brush: 'brush',
  mixerBrush: 'brush',
  pencil: 'pencil',
  colorReplacement: 'colorReplace',
  eraser: 'eraser',
  backgroundEraser: 'eraser',
  magicEraser: 'eraser',
  gradient: 'gradient',
  paintBucket: 'bucket',
  '3dMaterialDrop': 'bucket',
  blur: 'blur',
  sharpen: 'sharpen',
  smudge: 'smudge',
  dodge: 'dodge',
  burn: 'burn',
  sponge: 'sponge',
  pen: 'pen',
  curvaturePen: 'pen',
  addAnchor: 'addAnchor',
  deleteAnchor: 'deleteAnchor',
  convertPoint: 'convertPoint',
  horizontalType: 'type',
  verticalType: 'typeVertical',
  horizontalTypeMask: 'typeMask',
  verticalTypeMask: 'typeMask',
  selection: 'pathSelect',
  directSelection: 'directSelect',
  groupSelection: 'pathSelect',
  rectangle: 'shapeRect',
  roundedRectangle: 'shapeRounded',
  ellipse: 'shapeEllipse',
  triangle: 'shapePolygon',
  polygon: 'shapePolygon',
  line: 'shapeLine',
  customShape: 'shapeCustom',
  historyBrush: 'historyBrush',
  artHistoryBrush: 'historyBrush',
  hand: 'hand',
  rotateView: 'rotateView',
  zoom: 'zoom',
};

export const ToolIcon: React.FC<{ toolId: string; size?: number; title?: string }> = ({
  toolId,
  size = 18,
  title,
}) => <Icon name={TOOL_ICON[toolId] ?? 'generic'} size={size} title={title} />;

export const LAYER_ICON: Record<string, string> = {
  raster: 'layerRaster',
  vector: 'layerVector',
  adjustment: 'layerAdjust',
  text: 'layerText',
  fill: 'layerFill',
  group: 'layerGroup',
  mask: 'quickMaskOff',
};
