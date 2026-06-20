/** CS2 single-column toolbox layout: ordered groups, each a flyout of tool ids. */
export interface ToolGroup {
  primary: string; // default tool id shown
  members: string[]; // flyout members (incl. primary)
}

export const TOOLBOX_GROUPS: ToolGroup[][] = [
  // separated sections (visual separators between sub-arrays)
  [
    { primary: 'move', members: ['move'] },
    { primary: 'rectMarquee', members: ['rectMarquee', 'ellipseMarquee'] },
    { primary: 'lasso', members: ['lasso', 'polygonalLasso', 'magneticLasso'] },
    { primary: 'magicWand', members: ['magicWand', 'quickSelection'] },
    { primary: 'crop', members: ['crop', 'perspectiveCrop', 'slice'] },
  ],
  [
    { primary: 'spotHealing', members: ['spotHealing', 'healingBrush', 'patch', 'redEye'] },
    { primary: 'brush', members: ['brush', 'pencil', 'colorReplacement'] },
    { primary: 'cloneStamp', members: ['cloneStamp', 'patternStamp'] },
    { primary: 'historyBrush', members: ['historyBrush', 'artHistoryBrush'] },
    { primary: 'eraser', members: ['eraser', 'backgroundEraser', 'magicEraser'] },
    { primary: 'gradient', members: ['gradient', 'paintBucket'] },
    { primary: 'blur', members: ['blur', 'sharpen', 'smudge'] },
    { primary: 'dodge', members: ['dodge', 'burn', 'sponge'] },
  ],
  [
    { primary: 'pen', members: ['pen', 'curvaturePen', 'addAnchor', 'deleteAnchor', 'convertPoint'] },
    { primary: 'horizontalType', members: ['horizontalType', 'verticalType', 'horizontalTypeMask', 'verticalTypeMask'] },
    { primary: 'selection', members: ['selection', 'directSelection'] },
    { primary: 'rectangle', members: ['rectangle', 'roundedRectangle', 'ellipse', 'polygon', 'line', 'customShape'] },
  ],
  [
    { primary: 'eyedropper', members: ['eyedropper', 'colorSampler', 'ruler', 'note'] },
    { primary: 'hand', members: ['hand'] },
    { primary: 'zoom', members: ['zoom'] },
  ],
];
