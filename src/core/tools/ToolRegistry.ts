/**
 * Stratum - Complete Tool System
 * Implements all Photoshop, Illustrator, and Lightroom tools from the 2026 workflow guide
 */

import type { ToolDefinition, ToolOption, ToolCategory, SelectionData, VectorPath, AnchorPoint } from '../../types';

// ============================================================================
// PHOTOSHOP TOOLS
// ============================================================================

export const photoshopTools: ToolDefinition[] = [
  // Selection Tools
  {
    id: 'move',
    name: 'Move Tool',
    category: 'select',
    icon: '✥',
    shortcut: 'V',
    description: 'Move layers, selections, and objects',
    options: [
      { id: 'autoSelect', type: 'checkbox', label: 'Auto-Select Layer', default: false },
      { id: 'showTransform', type: 'checkbox', label: 'Show Transform Controls', default: false },
    ],
  },
  {
    id: 'rectMarquee',
    name: 'Rectangular Marquee Tool',
    category: 'select',
    icon: '◫',
    shortcut: 'M',
    description: 'Make rectangular selections',
    options: [
      { id: 'feather', type: 'slider', label: 'Feather', default: 0, min: 0, max: 250, step: 1 },
      { id: 'antiAlias', type: 'checkbox', label: 'Anti-alias', default: true },
      { id: 'style', type: 'dropdown', label: 'Style', default: 'Normal', options: ['Normal', 'Fixed Ratio', 'Fixed Size'] },
    ],
  },
  {
    id: 'ellipseMarquee',
    name: 'Elliptical Marquee Tool',
    category: 'select',
    icon: '◯',
    shortcut: 'M',
    description: 'Make elliptical selections',
    options: [
      { id: 'feather', type: 'slider', label: 'Feather', default: 0, min: 0, max: 250, step: 1 },
      { id: 'antiAlias', type: 'checkbox', label: 'Anti-alias', default: true },
    ],
  },
  {
    id: 'lasso',
    name: 'Lasso Tool',
    category: 'select',
    icon: '⊂',
    shortcut: 'L',
    description: 'Draw freehand selections',
    options: [
      { id: 'feather', type: 'slider', label: 'Feather', default: 0, min: 0, max: 250, step: 1 },
      { id: 'antiAlias', type: 'checkbox', label: 'Anti-alias', default: true },
    ],
  },
  {
    id: 'polygonalLasso',
    name: 'Polygonal Lasso Tool',
    category: 'select',
    icon: '⬔',
    shortcut: 'L',
    description: 'Create polygonal selections',
    options: [
      { id: 'feather', type: 'slider', label: 'Feather', default: 0, min: 0, max: 250, step: 1 },
      { id: 'antiAlias', type: 'checkbox', label: 'Anti-alias', default: true },
    ],
  },
  {
    id: 'magneticLasso',
    name: 'Magnetic Lasso Tool',
    category: 'select',
    icon: '🧲',
    shortcut: 'L',
    description: 'Snap to edges while drawing',
    options: [
      { id: 'width', type: 'slider', label: 'Width', default: 10, min: 1, max: 40, step: 1 },
      { id: 'contrast', type: 'slider', label: 'Contrast', default: 10, min: 1, max: 100, step: 1 },
      { id: 'frequency', type: 'slider', label: 'Frequency', default: 57, min: 0, max: 100, step: 1 },
    ],
  },
  {
    id: 'magicWand',
    name: 'Magic Wand Tool',
    category: 'select',
    icon: '🪄',
    shortcut: 'W',
    description: 'Select areas by color similarity',
    options: [
      { id: 'tolerance', type: 'slider', label: 'Tolerance', default: 32, min: 0, max: 255, step: 1 },
      { id: 'antiAlias', type: 'checkbox', label: 'Anti-alias', default: true },
      { id: 'contiguous', type: 'checkbox', label: 'Contiguous', default: true },
      { id: 'sampleAllLayers', type: 'checkbox', label: 'Sample All Layers', default: false },
    ],
  },
  {
    id: 'quickSelection',
    name: 'Quick Selection Tool',
    category: 'select',
    icon: '🖌️',
    shortcut: 'W',
    description: 'Intelligent edge-detection selection',
    options: [
      { id: 'brushSize', type: 'slider', label: 'Brush Size', default: 20, min: 1, max: 500, step: 1 },
      { id: 'sampleAllLayers', type: 'checkbox', label: 'Sample All Layers', default: false },
      { id: 'autoEnhance', type: 'checkbox', label: 'Auto-Enhance', default: true },
    ],
  },
  {
    id: 'objectSelection',
    name: 'Object Selection Tool',
    category: 'select',
    icon: '📦',
    shortcut: 'W',
    description: 'AI-powered object detection selection',
    options: [
      { id: 'mode', type: 'dropdown', label: 'Mode', default: 'Rectangle', options: ['Rectangle', 'Lasso'] },
      { id: 'sampleAllLayers', type: 'checkbox', label: 'Sample All Layers', default: false },
      { id: 'autoEnhance', type: 'checkbox', label: 'Auto-Enhance', default: true },
    ],
  },
  
  // Crop & Slice Tools
  {
    id: 'crop',
    name: 'Crop Tool',
    category: 'crop',
    icon: '⌗',
    shortcut: 'C',
    description: 'Crop and straighten images',
    options: [
      { id: 'ratio', type: 'dropdown', label: 'Ratio', default: 'Original', options: ['Original', '1:1', '4:3', '16:9', 'Custom'] },
      { id: 'straighten', type: 'checkbox', label: 'Straighten', default: false },
      { id: 'deleteCroppedPixels', type: 'checkbox', label: 'Delete Cropped Pixels', default: true },
    ],
  },
  {
    id: 'perspectiveCrop',
    name: 'Perspective Crop Tool',
    category: 'crop',
    icon: '⬛',
    shortcut: 'C',
    description: 'Correct perspective distortion',
    options: [],
  },
  {
    id: 'slice',
    name: 'Slice Tool',
    category: 'slice',
    icon: '✂',
    shortcut: 'Shift+C',
    description: 'Create slices for web export',
    options: [],
  },
  
  // Retouching Tools
  {
    id: 'spotHealing',
    name: 'Spot Healing Brush Tool',
    category: 'retouch',
    icon: '🩹',
    shortcut: 'J',
    description: 'Remove blemishes automatically',
    options: [
      { id: 'brushSize', type: 'slider', label: 'Size', default: 20, min: 1, max: 500, step: 1 },
      { id: 'hardness', type: 'slider', label: 'Hardness', default: 50, min: 0, max: 100, step: 1 },
      { id: 'type', type: 'dropdown', label: 'Type', default: 'Content-Aware', options: ['Content-Aware', 'Create Texture', 'Proximity Match'] },
    ],
  },
  {
    id: 'healingBrush',
    name: 'Healing Brush Tool',
    category: 'retouch',
    icon: '🖌️',
    shortcut: 'J',
    description: 'Sample and blend for repairs',
    options: [
      { id: 'brushSize', type: 'slider', label: 'Size', default: 20, min: 1, max: 500, step: 1 },
      { id: 'hardness', type: 'slider', label: 'Hardness', default: 50, min: 0, max: 100, step: 1 },
      { id: 'source', type: 'dropdown', label: 'Source', default: 'Sampled', options: ['Sampled', 'Pattern'] },
    ],
  },
  {
    id: 'patch',
    name: 'Patch Tool',
    category: 'retouch',
    icon: '🧩',
    shortcut: 'J',
    description: 'Repair with selection-based blending',
    options: [
      { id: 'patch', type: 'dropdown', label: 'Patch', default: 'Normal', options: ['Normal', 'Content-Aware'] },
      { id: 'adaptation', type: 'dropdown', label: 'Adaptation', default: 'Medium', options: ['Very Loose', 'Loose', 'Medium', 'Strict', 'Very Strict'] },
    ],
  },
  {
    id: 'contentAwareMove',
    name: 'Content-Aware Move Tool',
    category: 'retouch',
    icon: '🔄',
    shortcut: 'J',
    description: 'Move objects with intelligent fill',
    options: [
      { id: 'mode', type: 'dropdown', label: 'Mode', default: 'Move', options: ['Move', 'Extend'] },
      { id: 'adaptation', type: 'dropdown', label: 'Adaptation', default: 'Medium', options: ['Very Loose', 'Loose', 'Medium', 'Strict', 'Very Strict'] },
    ],
  },
  {
    id: 'redEye',
    name: 'Red Eye Tool',
    category: 'retouch',
    icon: '👁️',
    shortcut: 'J',
    description: 'Remove red-eye from flash photos',
    options: [
      { id: 'pupilSize', type: 'slider', label: 'Pupil Size', default: 50, min: 1, max: 100, step: 1 },
      { id: 'darkenAmount', type: 'slider', label: 'Darken Amount', default: 50, min: 1, max: 100, step: 1 },
    ],
  },
  {
    id: 'cloneStamp',
    name: 'Clone Stamp Tool',
    category: 'retouch',
    icon: '📋',
    shortcut: 'S',
    description: 'Duplicate pixels from source',
    options: [
      { id: 'brushSize', type: 'slider', label: 'Size', default: 20, min: 1, max: 500, step: 1 },
      { id: 'hardness', type: 'slider', label: 'Hardness', default: 50, min: 0, max: 100, step: 1 },
      { id: 'opacity', type: 'slider', label: 'Opacity', default: 100, min: 1, max: 100, step: 1 },
      { id: 'flow', type: 'slider', label: 'Flow', default: 100, min: 1, max: 100, step: 1 },
      { id: 'aligned', type: 'checkbox', label: 'Aligned', default: true },
      { id: 'sampleAllLayers', type: 'checkbox', label: 'Sample All Layers', default: false },
    ],
  },
  {
    id: 'patternStamp',
    name: 'Pattern Stamp Tool',
    category: 'retouch',
    icon: '🔲',
    shortcut: 'S',
    description: 'Paint with patterns',
    options: [
      { id: 'brushSize', type: 'slider', label: 'Size', default: 20, min: 1, max: 500, step: 1 },
      { id: 'pattern', type: 'dropdown', label: 'Pattern', default: 'Default', options: ['Default', 'Nature Patterns', 'Artist Surfaces'] },
      { id: 'imprint', type: 'checkbox', label: 'Impressionist', default: false },
    ],
  },
  
  // Painting Tools
  {
    id: 'brush',
    name: 'Brush Tool',
    category: 'paint',
    icon: '🖌',
    shortcut: 'B',
    description: 'Paint strokes with customizable brushes',
    options: [
      { id: 'brushSize', type: 'slider', label: 'Size', default: 20, min: 1, max: 5000, step: 1 },
      { id: 'hardness', type: 'slider', label: 'Hardness', default: 50, min: 0, max: 100, step: 1 },
      { id: 'opacity', type: 'slider', label: 'Opacity', default: 100, min: 1, max: 100, step: 1 },
      { id: 'flow', type: 'slider', label: 'Flow', default: 100, min: 1, max: 100, step: 1 },
      { id: 'smoothing', type: 'slider', label: 'Smoothing', default: 10, min: 0, max: 100, step: 1 },
    ],
  },
  {
    id: 'mixerBrush',
    name: 'Mixer Brush Tool',
    category: 'paint',
    icon: '🎨',
    shortcut: 'B',
    description: 'Simulate traditional painting techniques',
    options: [
      { id: 'brushSize', type: 'slider', label: 'Size', default: 20, min: 1, max: 500, step: 1 },
      { id: 'wet', type: 'slider', label: 'Wet', default: 20, min: 0, max: 100, step: 1 },
      { id: 'load', type: 'slider', label: 'Load', default: 50, min: 1, max: 100, step: 1 },
      { id: 'mix', type: 'slider', label: 'Mix', default: 50, min: 0, max: 100, step: 1 },
      { id: 'flow', type: 'slider', label: 'Flow', default: 100, min: 1, max: 100, step: 1 },
    ],
  },
  {
    id: 'pencil',
    name: 'Pencil Tool',
    category: 'paint',
    icon: '✏️',
    shortcut: 'B',
    description: 'Draw hard-edged strokes',
    options: [
      { id: 'brushSize', type: 'slider', label: 'Size', default: 5, min: 1, max: 500, step: 1 },
      { id: 'opacity', type: 'slider', label: 'Opacity', default: 100, min: 1, max: 100, step: 1 },
      { id: 'autoErase', type: 'checkbox', label: 'Auto Erase', default: false },
    ],
  },
  {
    id: 'colorReplacement',
    name: 'Color Replacement Tool',
    category: 'paint',
    icon: '🎨',
    shortcut: 'B',
    description: 'Replace colors while preserving texture',
    options: [
      { id: 'brushSize', type: 'slider', label: 'Size', default: 20, min: 1, max: 500, step: 1 },
      { id: 'limits', type: 'dropdown', label: 'Limits', default: 'Contiguous', options: ['Contiguous', 'Discontinuous', 'Find Edges'] },
      { id: 'tolerance', type: 'slider', label: 'Tolerance', default: 30, min: 1, max: 100, step: 1 },
    ],
  },
  
  // Drawing Tools
  {
    id: 'eraser',
    name: 'Eraser Tool',
    category: 'draw',
    icon: '🧽',
    shortcut: 'E',
    description: 'Erase pixels or restore history',
    options: [
      { id: 'brushSize', type: 'slider', label: 'Size', default: 20, min: 1, max: 500, step: 1 },
      { id: 'hardness', type: 'slider', label: 'Hardness', default: 50, min: 0, max: 100, step: 1 },
      { id: 'opacity', type: 'slider', label: 'Opacity', default: 100, min: 1, max: 100, step: 1 },
      { id: 'flow', type: 'slider', label: 'Flow', default: 100, min: 1, max: 100, step: 1 },
    ],
  },
  {
    id: 'backgroundEraser',
    name: 'Background Eraser Tool',
    category: 'draw',
    icon: '🌅',
    shortcut: 'E',
    description: 'Erase background while preserving edges',
    options: [
      { id: 'brushSize', type: 'slider', label: 'Size', default: 20, min: 1, max: 500, step: 1 },
      { id: 'limits', type: 'dropdown', label: 'Limits', default: 'Contiguous', options: ['Contiguous', 'Discontinuous', 'Find Edges'] },
      { id: 'tolerance', type: 'slider', label: 'Tolerance', default: 50, min: 1, max: 100, step: 1 },
    ],
  },
  {
    id: 'magicEraser',
    name: 'Magic Eraser Tool',
    category: 'draw',
    icon: '✨',
    shortcut: 'E',
    description: 'Erase similar colors in one click',
    options: [
      { id: 'tolerance', type: 'slider', label: 'Tolerance', default: 32, min: 0, max: 255, step: 1 },
      { id: 'antiAlias', type: 'checkbox', label: 'Anti-alias', default: true },
      { id: 'contiguous', type: 'checkbox', label: 'Contiguous', default: true },
      { id: 'sampleAllLayers', type: 'checkbox', label: 'Sample All Layers', default: false },
    ],
  },
  {
    id: 'gradient',
    name: 'Gradient Tool',
    category: 'draw',
    icon: '▤',
    shortcut: 'G',
    description: 'Create linear and radial gradients',
    options: [
      { id: 'type', type: 'dropdown', label: 'Type', default: 'Linear', options: ['Linear', 'Radial', 'Angular', 'Reflected', 'Diamond'] },
      { id: 'mode', type: 'dropdown', label: 'Mode', default: 'Normal', options: ['Normal', 'Multiply', 'Screen', 'Overlay'] },
      { id: 'opacity', type: 'slider', label: 'Opacity', default: 100, min: 1, max: 100, step: 1 },
      { id: 'reverse', type: 'checkbox', label: 'Reverse', default: false },
      { id: 'dither', type: 'checkbox', label: 'Dither', default: true },
    ],
  },
  {
    id: 'paintBucket',
    name: 'Paint Bucket Tool',
    category: 'draw',
    icon: '🪣',
    shortcut: 'G',
    description: 'Fill areas with color or pattern',
    options: [
      { id: 'fill', type: 'dropdown', label: 'Fill', default: 'Foreground', options: ['Foreground', 'Pattern'] },
      { id: 'tolerance', type: 'slider', label: 'Tolerance', default: 32, min: 0, max: 255, step: 1 },
      { id: 'antiAlias', type: 'checkbox', label: 'Anti-alias', default: true },
      { id: 'contiguous', type: 'checkbox', label: 'Contiguous', default: true },
    ],
  },
  {
    id: '3dMaterialDrop',
    name: '3D Material Drop Tool',
    category: 'draw',
    icon: '🧊',
    shortcut: 'G',
    description: 'Apply materials to 3D objects',
    options: [],
  },
  
  // Measurement & Navigation
  {
    id: 'eyedropper',
    name: 'Eyedropper Tool',
    category: 'navigation',
    icon: '💉',
    shortcut: 'I',
    description: 'Sample colors from the canvas',
    options: [
      { id: 'sampleSize', type: 'dropdown', label: 'Sample Size', default: 'Point Sample', options: ['Point Sample', '3x3 Average', '5x5 Average', '11x11 Average', '31x31 Average', '51x51 Average', '101x101 Average'] },
      { id: 'sample', type: 'dropdown', label: 'Sample', default: 'Current Layer', options: ['Current Layer', 'Current & Below', 'All Layers'] },
    ],
  },
  {
    id: 'colorSampler',
    name: 'Color Sampler Tool',
    category: 'navigation',
    icon: '🎯',
    shortcut: 'I',
    description: 'Place persistent color samplers',
    options: [
      { id: 'sampleSize', type: 'dropdown', label: 'Sample Size', default: '3x3 Average', options: ['Point Sample', '3x3 Average', '5x5 Average', '11x11 Average'] },
    ],
  },
  {
    id: 'ruler',
    name: 'Ruler Tool',
    category: 'navigation',
    icon: '📏',
    shortcut: 'I',
    description: 'Measure distances and angles',
    options: [],
  },
  {
    id: 'note',
    name: 'Note Tool',
    category: 'navigation',
    icon: '📝',
    shortcut: 'I',
    description: 'Add annotations to the document',
    options: [],
  },
  {
    id: 'count',
    name: 'Count Tool',
    category: 'navigation',
    icon: '🔢',
    shortcut: 'I',
    description: 'Count objects in an image',
    options: [],
  },
  
  // Retouching (continued)
  {
    id: 'blur',
    name: 'Blur Tool',
    category: 'retouch',
    icon: '💨',
    shortcut: 'R',
    description: 'Soften edges and details',
    options: [
      { id: 'brushSize', type: 'slider', label: 'Size', default: 20, min: 1, max: 500, step: 1 },
      { id: 'strength', type: 'slider', label: 'Strength', default: 50, min: 1, max: 100, step: 1 },
      { id: 'sampleAllLayers', type: 'checkbox', label: 'Sample All Layers', default: false },
    ],
  },
  {
    id: 'sharpen',
    name: 'Sharpen Tool',
    category: 'retouch',
    icon: '🔺',
    shortcut: 'R',
    description: 'Enhance edge contrast',
    options: [
      { id: 'brushSize', type: 'slider', label: 'Size', default: 20, min: 1, max: 500, step: 1 },
      { id: 'strength', type: 'slider', label: 'Strength', default: 50, min: 1, max: 100, step: 1 },
      { id: 'protectDetail', type: 'checkbox', label: 'Protect Detail', default: true },
    ],
  },
  {
    id: 'smudge',
    name: 'Smudge Tool',
    category: 'retouch',
    icon: '👆',
    shortcut: 'R',
    description: 'Drag and blend colors',
    options: [
      { id: 'brushSize', type: 'slider', label: 'Size', default: 20, min: 1, max: 500, step: 1 },
      { id: 'strength', type: 'slider', label: 'Strength', default: 50, min: 1, max: 100, step: 1 },
      { id: 'fingerPainting', type: 'checkbox', label: 'Finger Painting', default: false },
      { id: 'sampleAllLayers', type: 'checkbox', label: 'Sample All Layers', default: false },
    ],
  },
  
  // Dodge & Burn
  {
    id: 'dodge',
    name: 'Dodge Tool',
    category: 'retouch',
    icon: '☀️',
    shortcut: 'O',
    description: 'Lighten specific areas',
    options: [
      { id: 'brushSize', type: 'slider', label: 'Size', default: 20, min: 1, max: 500, step: 1 },
      { id: 'range', type: 'dropdown', label: 'Range', default: 'Midtones', options: ['Shadows', 'Midtones', 'Highlights'] },
      { id: 'exposure', type: 'slider', label: 'Exposure', default: 50, min: 1, max: 100, step: 1 },
      { id: 'protectTones', type: 'checkbox', label: 'Protect Tones', default: true },
    ],
  },
  {
    id: 'burn',
    name: 'Burn Tool',
    category: 'retouch',
    icon: '🔥',
    shortcut: 'O',
    description: 'Darken specific areas',
    options: [
      { id: 'brushSize', type: 'slider', label: 'Size', default: 20, min: 1, max: 500, step: 1 },
      { id: 'range', type: 'dropdown', label: 'Range', default: 'Midtones', options: ['Shadows', 'Midtones', 'Highlights'] },
      { id: 'exposure', type: 'slider', label: 'Exposure', default: 50, min: 1, max: 100, step: 1 },
      { id: 'protectTones', type: 'checkbox', label: 'Protect Tones', default: true },
    ],
  },
  {
    id: 'sponge',
    name: 'Sponge Tool',
    category: 'retouch',
    icon: '🧽',
    shortcut: 'O',
    description: 'Adjust color saturation',
    options: [
      { id: 'brushSize', type: 'slider', label: 'Size', default: 20, min: 1, max: 500, step: 1 },
      { id: 'mode', type: 'dropdown', label: 'Mode', default: 'Saturate', options: ['Saturate', 'Desaturate'] },
      { id: 'flow', type: 'slider', label: 'Flow', default: 50, min: 1, max: 100, step: 1 },
      { id: 'vibrance', type: 'checkbox', label: 'Vibrance', default: true },
    ],
  },
  
  // Type Tools
  {
    id: 'horizontalType',
    name: 'Horizontal Type Tool',
    category: 'type',
    icon: 'T',
    shortcut: 'T',
    description: 'Add horizontal text',
    options: [
      { id: 'fontFamily', type: 'dropdown', label: 'Font', default: 'Arial', options: ['Arial', 'Helvetica', 'Times New Roman', 'Georgia'] },
      { id: 'fontSize', type: 'slider', label: 'Size', default: 12 },
      { id: 'alignment', type: 'dropdown', label: 'Alignment', default: 'Left', options: ['Left', 'Center', 'Right', 'Justify'] },
    ],
  },
  {
    id: 'verticalType',
    name: 'Vertical Type Tool',
    category: 'type',
    icon: 'T⬇',
    shortcut: 'T',
    description: 'Add vertical text',
    options: [
      { id: 'fontFamily', type: 'dropdown', label: 'Font', default: 'Arial', options: ['Arial', 'Helvetica', 'Times New Roman', 'Georgia'] },
      { id: 'fontSize', type: 'slider', label: 'Size', default: 12 },
    ],
  },
  {
    id: 'horizontalTypeMask',
    name: 'Horizontal Type Mask Tool',
    category: 'type',
    icon: 'T◫',
    shortcut: 'T',
    description: 'Create text-shaped selections',
    options: [],
  },
  {
    id: 'verticalTypeMask',
    name: 'Vertical Type Mask Tool',
    category: 'type',
    icon: 'T⬇◫',
    shortcut: 'T',
    description: 'Create vertical text selections',
    options: [],
  },
  
  // Pen & Vector Tools
  {
    id: 'pen',
    name: 'Pen Tool',
    category: 'vector',
    icon: '✒',
    shortcut: 'P',
    description: 'Create precise vector paths',
    options: [
      { id: 'pathMode', type: 'dropdown', label: 'Mode', default: 'Path', options: ['Shape', 'Path'] },
      { id: 'rubberBand', type: 'checkbox', label: 'Rubber Band', default: false },
    ],
  },
  {
    id: 'curvaturePen',
    name: 'Curvature Pen Tool',
    category: 'vector',
    icon: '〰️',
    shortcut: 'P',
    description: 'Draw smooth curves easily',
    options: [],
  },
  {
    id: 'addAnchor',
    name: 'Add Anchor Point Tool',
    category: 'vector',
    icon: '+',
    shortcut: 'P',
    description: 'Add points to existing paths',
    options: [],
  },
  {
    id: 'deleteAnchor',
    name: 'Delete Anchor Point Tool',
    category: 'vector',
    icon: '-',
    shortcut: 'P',
    description: 'Remove points from paths',
    options: [],
  },
  {
    id: 'convertPoint',
    name: 'Convert Point Tool',
    category: 'vector',
    icon: '⤡',
    shortcut: 'P',
    description: 'Convert between corner and smooth points',
    options: [],
  },
  
  // Shape Tools
  {
    id: 'rectangle',
    name: 'Rectangle Tool',
    category: 'vector',
    icon: '▭',
    shortcut: 'U',
    description: 'Draw rectangles and squares',
    options: [
      { id: 'toolMode', type: 'dropdown', label: 'Mode', default: 'Shape', options: ['Shape', 'Path', 'Pixels'] },
      { id: 'fill', type: 'color', label: 'Fill', default: '#000000' },
      { id: 'stroke', type: 'color', label: 'Stroke', default: '#000000' },
      { id: 'strokeWidth', type: 'slider', label: 'Stroke', default: 1 },
    ],
  },
  {
    id: 'roundedRectangle',
    name: 'Rounded Rectangle Tool',
    category: 'vector',
    icon: '▢',
    shortcut: 'U',
    description: 'Draw rectangles with rounded corners',
    options: [
      { id: 'radius', type: 'slider', label: 'Radius', default: 10, min: 0, max: 500, step: 1 },
    ],
  },
  {
    id: 'ellipse',
    name: 'Ellipse Tool',
    category: 'vector',
    icon: '◯',
    shortcut: 'U',
    description: 'Draw ellipses and circles',
    options: [],
  },
  {
    id: 'triangle',
    name: 'Triangle Tool',
    category: 'vector',
    icon: '△',
    shortcut: 'U',
    description: 'Draw triangles',
    options: [],
  },
  {
    id: 'polygon',
    name: 'Polygon Tool',
    category: 'vector',
    icon: '⬠',
    shortcut: 'U',
    description: 'Draw polygons',
    options: [
      { id: 'sides', type: 'slider', label: 'Sides', default: 5, min: 3, max: 100, step: 1 },
    ],
  },
  {
    id: 'line',
    name: 'Line Tool',
    category: 'vector',
    icon: '╱',
    shortcut: 'U',
    description: 'Draw straight lines',
    options: [
      { id: 'weight', type: 'slider', label: 'Weight', default: 1, min: 1, max: 1000, step: 1 },
      { id: 'arrowheads', type: 'dropdown', label: 'Arrowheads', default: 'None', options: ['None', 'Start', 'End', 'Both'] },
    ],
  },
  {
    id: 'customShape',
    name: 'Custom Shape Tool',
    category: 'vector',
    icon: '⭐',
    shortcut: 'U',
    description: 'Draw custom shapes',
    options: [
      { id: 'shape', type: 'dropdown', label: 'Shape', default: 'Heart', options: ['Heart', 'Star', 'Arrow', 'Music Note', 'Checkmark'] },
    ],
  },
  
  // History & Adjustment Brushes
  {
    id: 'historyBrush',
    name: 'History Brush Tool',
    category: 'retouch',
    icon: '🕐',
    shortcut: 'Y',
    description: 'Paint from a history state',
    options: [
      { id: 'brushSize', type: 'slider', label: 'Size', default: 20, min: 1, max: 500, step: 1 },
      { id: 'opacity', type: 'slider', label: 'Opacity', default: 100, min: 1, max: 100, step: 1 },
    ],
  },
  {
    id: 'artHistoryBrush',
    name: 'Art History Brush Tool',
    category: 'retouch',
    icon: '🎨',
    shortcut: 'Y',
    description: 'Paint with stylized strokes',
    options: [
      { id: 'brushSize', type: 'slider', label: 'Size', default: 20, min: 1, max: 500, step: 1 },
      { id: 'style', type: 'dropdown', label: 'Style', default: 'Short Tight', options: ['Short Tight', 'Short Medium', 'Short Long', 'Medium Tight', 'Medium', 'Medium Long', 'Long Tight', 'Long', 'Dab', 'Curly', 'Loose Medium', 'Loose Long'] },
      { id: 'area', type: 'slider', label: 'Area', default: 50, min: 1, max: 100, step: 1 },
      { id: 'tolerance', type: 'slider', label: 'Tolerance', default: 0, min: 0, max: 100, step: 1 },
    ],
  },
];

// ============================================================================
// ILLUSTRATOR TOOLS
// ============================================================================

export const illustratorTools: ToolDefinition[] = [
  // Selection Tools
  {
    id: 'selection',
    name: 'Selection Tool',
    category: 'select',
    icon: '➤',
    shortcut: 'V',
    description: 'Select and move entire objects',
    options: [],
  },
  {
    id: 'directSelection',
    name: 'Direct Selection Tool',
    category: 'select',
    icon: '➤',
    shortcut: 'A',
    description: 'Select anchor points and path segments',
    options: [],
  },
  {
    id: 'groupSelection',
    name: 'Group Selection Tool',
    category: 'select',
    icon: '➤+',
    shortcut: 'Shift+I',
    description: 'Select nested objects within groups',
    options: [],
  },
  {
    id: 'magicWand',
    name: 'Magic Wand Tool',
    category: 'select',
    icon: '🪄',
    shortcut: 'Y',
    description: 'Select objects with similar attributes',
    options: [
      { id: 'tolerance', type: 'slider', label: 'Tolerance', default: 20, min: 0, max: 100, step: 1 },
    ],
  },
  {
    id: 'lasso',
    name: 'Lasso Tool',
    category: 'select',
    icon: '⊂',
    shortcut: 'Q',
    description: 'Draw freehand selections around objects',
    options: [],
  },
  
  // Drawing Tools
  {
    id: 'pen',
    name: 'Pen Tool',
    category: 'vector',
    icon: '✒',
    shortcut: 'P',
    description: 'Create precise vector paths',
    options: [],
  },
  {
    id: 'curvature',
    name: 'Curvature Tool',
    category: 'vector',
    icon: '〰️',
    shortcut: 'Shift+`',
    description: 'Draw smooth curves intuitively',
    options: [],
  },
  {
    id: 'pencil',
    name: 'Pencil Tool',
    category: 'vector',
    icon: '✏️',
    shortcut: 'N',
    description: 'Draw freeform paths',
    options: [
      { id: 'fidelity', type: 'slider', label: 'Fidelity', default: 50, min: 0, max: 100, step: 1 },
      { id: 'smoothness', type: 'slider', label: 'Smoothness', default: 0, min: 0, max: 100, step: 1 },
    ],
  },
  {
    id: 'smooth',
    name: 'Smooth Tool',
    category: 'vector',
    icon: '〰️',
    shortcut: '',
    description: 'Smooth rough paths',
    options: [],
  },
  {
    id: 'join',
    name: 'Join Tool',
    category: 'vector',
    icon: '🔗',
    shortcut: 'Ctrl+J',
    description: 'Connect open path endpoints',
    options: [],
  },
  {
    id: 'shaper',
    name: 'Shaper Tool',
    category: 'vector',
    icon: '✏️',
    shortcut: 'Shift+N',
    description: 'Combine shapes with gestures',
    options: [],
  },
  
  // Shape Tools
  {
    id: 'rectangle',
    name: 'Rectangle Tool',
    category: 'vector',
    icon: '▭',
    shortcut: 'M',
    description: 'Draw rectangles',
    options: [],
  },
  {
    id: 'roundedRectangle',
    name: 'Rounded Rectangle Tool',
    category: 'vector',
    icon: '▢',
    shortcut: 'M',
    description: 'Draw rounded rectangles',
    options: [],
  },
  {
    id: 'ellipse',
    name: 'Ellipse Tool',
    category: 'vector',
    icon: '◯',
    shortcut: 'L',
    description: 'Draw ellipses and circles',
    options: [],
  },
  {
    id: 'polygon',
    name: 'Polygon Tool',
    category: 'vector',
    icon: '⬠',
    shortcut: 'Shift+L',
    description: 'Draw polygons',
    options: [],
  },
  {
    id: 'star',
    name: 'Star Tool',
    category: 'vector',
    icon: '⭐',
    shortcut: 'Shift+L',
    description: 'Draw stars',
    options: [],
  },
  {
    id: 'flare',
    name: 'Flare Tool',
    category: 'vector',
    icon: '✨',
    shortcut: 'Shift+L',
    description: 'Create lens flare effects',
    options: [],
  },
  {
    id: 'lineSegment',
    name: 'Line Segment Tool',
    category: 'vector',
    icon: '╱',
    shortcut: '\\',
    description: 'Draw straight lines',
    options: [],
  },
  {
    id: 'arc',
    name: 'Arc Tool',
    category: 'vector',
    icon: '⌒',
    shortcut: 'Shift+L',
    description: 'Draw curved arcs',
    options: [],
  },
  {
    id: 'spiral',
    name: 'Spiral Tool',
    category: 'vector',
    icon: '🌀',
    shortcut: 'Shift+L',
    description: 'Draw spirals',
    options: [],
  },
  {
    id: 'grid',
    name: 'Rectangular Grid Tool',
    category: 'vector',
    icon: '▦',
    shortcut: '',
    description: 'Create grid patterns',
    options: [],
  },
  {
    id: 'polarGrid',
    name: 'Polar Grid Tool',
    category: 'vector',
    icon: '◎',
    shortcut: '',
    description: 'Create polar grid patterns',
    options: [],
  },
  
  // Paint & Fill Tools
  {
    id: 'paintbrush',
    name: 'Paintbrush Tool',
    category: 'vector',
    icon: '🖌',
    shortcut: 'B',
    description: 'Draw with artistic brushes',
    options: [
      { id: 'fidelity', type: 'slider', label: 'Fidelity', default: 50, min: 0, max: 100, step: 1 },
      { id: 'smoothness', type: 'slider', label: 'Smoothness', default: 0, min: 0, max: 100, step: 1 },
    ],
  },
  {
    id: 'blobBrush',
    name: 'Blob Brush Tool',
    category: 'vector',
    icon: '🖍',
    shortcut: 'Shift+B',
    description: 'Draw filled shapes that merge',
    options: [
      { id: 'size', type: 'slider', label: 'Size', default: 10, min: 1, max: 500, step: 1 },
    ],
  },
  {
    id: 'eraser',
    name: 'Eraser Tool',
    category: 'vector',
    icon: '🧽',
    shortcut: 'Shift+E',
    description: 'Erase parts of vector objects',
    options: [
      { id: 'size', type: 'slider', label: 'Size', default: 20, min: 1, max: 500, step: 1 },
    ],
  },
  {
    id: 'scissors',
    name: 'Scissors Tool',
    category: 'vector',
    icon: '✂',
    shortcut: 'C',
    description: 'Cut paths at specific points',
    options: [],
  },
  {
    id: 'knife',
    name: 'Knife Tool',
    category: 'vector',
    icon: '🔪',
    shortcut: 'Shift+C',
    description: 'Cut shapes into separate paths',
    options: [],
  },
  
  // Shape Modification Tools
  {
    id: 'shapeBuilder',
    name: 'Shape Builder Tool',
    category: 'vector',
    icon: '🔨',
    shortcut: 'Shift+M',
    description: 'Combine and divide shapes interactively',
    options: [],
  },
  {
    id: 'livePaintBucket',
    name: 'Live Paint Bucket Tool',
    category: 'vector',
    icon: '🪣',
    shortcut: 'K',
    description: 'Fill enclosed areas dynamically',
    options: [],
  },
  {
    id: 'livePaintSelection',
    name: 'Live Paint Selection Tool',
    category: 'vector',
    icon: '➤',
    shortcut: 'Shift+L',
    description: 'Select faces and edges in Live Paint groups',
    options: [],
  },
  
  // Type Tools
  {
    id: 'type',
    name: 'Type Tool',
    category: 'type',
    icon: 'T',
    shortcut: 'T',
    description: 'Add point text',
    options: [],
  },
  {
    id: 'areaType',
    name: 'Area Type Tool',
    category: 'type',
    icon: 'T▭',
    shortcut: 'Shift+T',
    description: 'Add text inside shapes',
    options: [],
  },
  {
    id: 'typeOnPath',
    name: 'Type on a Path Tool',
    category: 'type',
    icon: 'T〜',
    shortcut: 'Shift+T',
    description: 'Add text along a path',
    options: [],
  },
  {
    id: 'verticalType',
    name: 'Vertical Type Tool',
    category: 'type',
    icon: 'T⬇',
    shortcut: 'T',
    description: 'Add vertical point text',
    options: [],
  },
  {
    id: 'verticalAreaType',
    name: 'Vertical Area Type Tool',
    category: 'type',
    icon: 'T⬇▭',
    shortcut: 'Shift+T',
    description: 'Add vertical text inside shapes',
    options: [],
  },
  {
    id: 'verticalTypeOnPath',
    name: 'Vertical Type on a Path Tool',
    category: 'type',
    icon: 'T⬇〜',
    shortcut: 'Shift+T',
    description: 'Add vertical text along a path',
    options: [],
  },
  {
    id: 'touchType',
    name: 'Touch Type Tool',
    category: 'type',
    icon: 'T✥',
    shortcut: 'Shift+T',
    description: 'Manipulate individual characters',
    options: [],
  },
  
  // Transform Tools
  {
    id: 'rotate',
    name: 'Rotate Tool',
    category: 'select',
    icon: '🔄',
    shortcut: 'R',
    description: 'Rotate objects around a point',
    options: [],
  },
  {
    id: 'reflect',
    name: 'Reflect Tool',
    category: 'select',
    icon: '↔',
    shortcut: 'O',
    description: 'Mirror objects',
    options: [],
  },
  {
    id: 'scale',
    name: 'Scale Tool',
    category: 'select',
    icon: '⤢',
    shortcut: 'S',
    description: 'Resize objects proportionally',
    options: [],
  },
  {
    id: 'shear',
    name: 'Shear Tool',
    category: 'select',
    icon: '⃦',
    shortcut: '',
    description: 'Skew objects horizontally or vertically',
    options: [],
  },
  {
    id: 'rescale',
    name: 'Reshape Tool',
    category: 'select',
    icon: '〰️',
    shortcut: '',
    description: 'Distort selected portions of paths',
    options: [],
  },
  {
    id: 'width',
    name: 'Width Tool',
    category: 'vector',
    icon: '⇹',
    shortcut: 'Shift+W',
    description: 'Vary stroke width along a path',
    options: [],
  },
  {
    id: 'freeTransform',
    name: 'Free Transform Tool',
    category: 'select',
    icon: '⤡',
    shortcut: 'E',
    description: 'Apply multiple transformations',
    options: [],
  },
  
  // Eyedropper & Measure
  {
    id: 'eyedropper',
    name: 'Eyedropper Tool',
    category: 'navigation',
    icon: '💉',
    shortcut: 'I',
    description: 'Sample colors and attributes',
    options: [],
  },
  {
    id: 'measure',
    name: 'Measure Tool',
    category: 'navigation',
    icon: '📏',
    shortcut: '',
    description: 'Measure distances between points',
    options: [],
  },
  
  // Symbol Tools
  {
    id: 'symbolSprayer',
    name: 'Symbol Sprayer Tool',
    category: 'vector',
    icon: '💨',
    shortcut: 'Shift+S',
    description: ' Spray symbol instances',
    options: [],
  },
  {
    id: 'symbolShifter',
    name: 'Symbol Shifter Tool',
    category: 'vector',
    icon: '✥',
    shortcut: 'Shift+S',
    description: 'Move symbol instances',
    options: [],
  },
  {
    id: 'symbolScruncher',
    name: 'Symbol Scruncher Tool',
    category: 'vector',
    icon: '🗜',
    shortcut: 'Shift+S',
    description: 'Compress symbol instances',
    options: [],
  },
  {
    id: 'symbolSizer',
    name: 'Symbol Sizer Tool',
    category: 'vector',
    icon: '⤢',
    shortcut: 'Shift+S',
    description: 'Resize symbol instances',
    options: [],
  },
  {
    id: 'symbolSpinner',
    name: 'Symbol Spinner Tool',
    category: 'vector',
    icon: '🔄',
    shortcut: 'Shift+S',
    description: 'Rotate symbol instances',
    options: [],
  },
  {
    id: 'symbolStainer',
    name: 'Symbol Stainer Tool',
    category: 'vector',
    icon: '🎨',
    shortcut: 'Shift+S',
    description: 'Tint symbol instances',
    options: [],
  },
  {
    id: 'symbolScreener',
    name: 'Symbol Screener Tool',
    category: 'vector',
    icon: '◫',
    shortcut: 'Shift+S',
    description: 'Adjust symbol instance opacity',
    options: [],
  },
  {
    id: 'symbolStyler',
    name: 'Symbol Styler Tool',
    category: 'vector',
    icon: '🖌',
    shortcut: 'Shift+S',
    description: 'Apply graphic styles to symbols',
    options: [],
  },
];

// ============================================================================
// LIGHTROOM TOOLS
// ============================================================================

export const lightroomTools: ToolDefinition[] = [
  // Library Module Tools
  {
    id: 'libraryGrid',
    name: 'Grid View',
    category: 'navigation',
    icon: '▦',
    shortcut: 'G',
    description: 'View photos in grid layout',
    options: [],
  },
  {
    id: 'libraryLoupe',
    name: 'Loupe View',
    category: 'navigation',
    icon: '🔍',
    shortcut: 'E',
    description: 'View single photo in detail',
    options: [],
  },
  {
    id: 'libraryCompare',
    name: 'Compare View',
    category: 'navigation',
    icon: '⬌',
    shortcut: 'C',
    description: 'Compare two photos side by side',
    options: [],
  },
  {
    id: 'librarySurvey',
    name: 'Survey View',
    category: 'navigation',
    icon: '▦',
    shortcut: 'N',
    description: 'View multiple photos together',
    options: [],
  },
  {
    id: 'people',
    name: 'People View',
    category: 'navigation',
    icon: '👤',
    shortcut: '',
    description: 'Organize photos by people',
    options: [],
  },
  {
    id: 'folders',
    name: 'Folders Panel',
    category: 'navigation',
    icon: '📁',
    shortcut: '',
    description: 'Browse folder structure',
    options: [],
  },
  {
    id: 'collections',
    name: 'Collections Panel',
    category: 'navigation',
    icon: '📚',
    shortcut: '',
    description: 'Manage photo collections',
    options: [],
  },
  
  // Develop Module - Basic Panel
  {
    id: 'cropOverlay',
    name: 'Crop Overlay',
    category: 'crop',
    icon: '⌗',
    shortcut: 'R',
    description: 'Crop and straighten photos',
    options: [
      { id: 'aspectRatio', type: 'dropdown', label: 'Aspect', default: 'Original', options: ['Original', '1:1', '4:3', '16:9', 'Custom'] },
      { id: 'straighten', type: 'checkbox', label: 'Straighten', default: false },
    ],
  },
  {
    id: 'spotRemoval',
    name: 'Spot Removal',
    category: 'retouch',
    icon: '🩹',
    shortcut: 'Q',
    description: 'Remove spots and blemishes',
    options: [
      { id: 'tool', type: 'dropdown', label: 'Tool', default: 'Heal', options: ['Heal', 'Clone'] },
      { id: 'size', type: 'slider', label: 'Size', default: 10, min: 1, max: 100, step: 1 },
      { id: 'feather', type: 'slider', label: 'Feather', default: 50, min: 0, max: 100, step: 1 },
      { id: 'opacity', type: 'slider', label: 'Opacity', default: 100, min: 1, max: 100, step: 1 },
    ],
  },
  {
    id: 'redEyeCorrection',
    name: 'Red-Eye Correction',
    category: 'retouch',
    icon: '👁️',
    shortcut: '',
    description: 'Fix red-eye in portraits',
    options: [],
  },
  {
    id: 'graduatedFilter',
    name: 'Graduated Filter',
    category: 'select',
    icon: '▤',
    shortcut: 'M',
    description: 'Apply graduated adjustments',
    options: [],
  },
  {
    id: 'radialFilter',
    name: 'Radial Filter',
    category: 'select',
    icon: '◯',
    shortcut: 'Shift+M',
    description: 'Apply radial adjustments',
    options: [],
  },
  {
    id: 'adjustmentBrush',
    name: 'Adjustment Brush',
    category: 'paint',
    icon: '🖌',
    shortcut: 'K',
    description: 'Paint adjustments locally',
    options: [
      { id: 'size', type: 'slider', label: 'Size', default: 10, min: 1, max: 100, step: 1 },
      { id: 'feather', type: 'slider', label: 'Feather', default: 50, min: 0, max: 100, step: 1 },
      { id: 'flow', type: 'slider', label: 'Flow', default: 50, min: 1, max: 100, step: 1 },
      { id: 'density', type: 'slider', label: 'Density', default: 50, min: 1, max: 100, step: 1 },
      { id: 'autoMask', type: 'checkbox', label: 'Auto Mask', default: false },
    ],
  },
  {
    id: 'rangeMask',
    name: 'Range Mask',
    category: 'select',
    icon: '🎯',
    shortcut: '',
    description: 'Refine masks by range',
    options: [
      { id: 'type', type: 'dropdown', label: 'Type', default: 'None', options: ['None', 'Color', 'Luminance', 'Depth'] },
    ],
  },
  {
    id: 'aiSelectSubject',
    name: 'Select Subject',
    category: 'select',
    icon: '👤',
    shortcut: '',
    description: 'AI-powered subject selection',
    options: [],
  },
  {
    id: 'aiSelectSky',
    name: 'Select Sky',
    category: 'select',
    icon: '☁️',
    shortcut: '',
    description: 'AI-powered sky selection',
    options: [],
  },
  {
    id: 'aiSelectBackground',
    name: 'Select Background',
    category: 'select',
    icon: '🖼',
    shortcut: '',
    description: 'AI-powered background selection',
    options: [],
  },
  {
    id: 'aiSelectPeople',
    name: 'Select People',
    category: 'select',
    icon: '👥',
    shortcut: '',
    description: 'AI-powered people selection',
    options: [],
  },
  {
    id: 'removeTool',
    name: 'Remove Tool',
    category: 'retouch',
    icon: '✨',
    shortcut: '',
    description: 'AI-powered object removal',
    options: [
      { id: 'brushSize', type: 'slider', label: 'Size', default: 20, min: 1, max: 500, step: 1 },
    ],
  },
  
  // Navigation & Utility
  {
    id: 'zoom',
    name: 'Zoom Tool',
    category: 'navigation',
    icon: '🔍',
    shortcut: 'Z',
    description: 'Zoom in and out',
    options: [],
  },
  {
    id: 'hand',
    name: 'Hand Tool',
    category: 'navigation',
    icon: '✋',
    shortcut: 'H',
    description: 'Pan around the image',
    options: [],
  },
  {
    id: 'targetedAdjustment',
    name: 'Targeted Adjustment Tool',
    category: 'navigation',
    icon: '🎯',
    shortcut: '',
    description: 'Adjust by dragging on image',
    options: [
      { id: 'param', type: 'dropdown', label: 'Parameter', default: 'Tone', options: ['Tone', 'Color', 'Grayscale Mix', 'Saturation'] },
    ],
  },
  {
    id: 'whiteBalance',
    name: 'White Balance Selector',
    category: 'navigation',
    icon: '💉',
    shortcut: 'W',
    description: 'Set white balance by sampling',
    options: [],
  },
];

// ============================================================================
// TOOL REGISTRY
// ============================================================================

export const allTools: ToolDefinition[] = [
  ...photoshopTools,
  ...illustratorTools,
  ...lightroomTools,
];

export function getToolById(id: string): ToolDefinition | undefined {
  return allTools.find(tool => tool.id === id);
}

export function getToolsByCategory(category: string): ToolDefinition[] {
  return allTools.filter(tool => tool.category === category);
}

export function getToolsByShortcut(shortcut: string): ToolDefinition[] {
  return allTools.filter(tool => tool.shortcut === shortcut);
}

export function getNextToolWithSameShortcut(currentToolId: string): ToolDefinition | null {
  const currentTool = getToolById(currentToolId);
  if (!currentTool || !currentTool.shortcut) return null;
  
  const toolsWithSameShortcut = getToolsByShortcut(currentTool.shortcut);
  if (toolsWithSameShortcut.length <= 1) return null;
  
  const currentIndex = toolsWithSameShortcut.findIndex(t => t.id === currentToolId);
  const nextIndex = (currentIndex + 1) % toolsWithSameShortcut.length;
  
  return toolsWithSameShortcut[nextIndex];
}

// ============================================================================
// EXPORTED TYPES AND CLASSES
// ============================================================================

// Single source of truth for these types lives in types/index.ts. Re-export so existing
// imports (`import { type ToolCategory } from '.../ToolRegistry'`) keep working but stay unified.
export type { ToolCategory };
export type ToolOptionDef = ToolOption;

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    // Initialize with all tools
    for (const tool of allTools) {
      this.tools.set(tool.id, tool);
    }
  }

  getTool(id: string): ToolDefinition | undefined {
    return this.tools.get(id);
  }

  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getToolsByCategory(category: ToolCategory): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(tool => tool.category === category);
  }

  registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.id, tool);
  }

  unregisterTool(id: string): void {
    this.tools.delete(id);
  }
}

// Singleton instance
let registryInstance: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
  if (!registryInstance) {
    registryInstance = new ToolRegistry();
  }
  return registryInstance;
}
