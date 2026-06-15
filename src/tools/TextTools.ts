/**
 * Unified Canvas - Text Tool
 * Horizontal/Vertical Type, Type Masks
 */

import { BaseTool, Tool, ToolContext } from './ToolBase';
import type { Point, Layer, TextData, Color, ToolType, ToolOptions } from '../types';
import { VectorRenderer } from '../engine/VectorRenderer';

export class TypeTool extends BaseTool {
  type = 'horizontal-type' as ToolType;
  cursor = 'text';
  private isEditing = false;
  private textLayer: Layer | null = null;
  private cursorPosition = 0;
  private selectionStart: number | null = null;
  private compositionString = '';
  private renderer: VectorRenderer;

  constructor() {
    super();
    this.renderer = new VectorRenderer();
  }

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isEditing && this.textLayer) {
      // Check if clicking outside text box to commit
      const bounds = this.getTextBounds(this.textLayer);
      if (!this.pointInBounds(point, bounds)) {
        this.commitText(context);
        return;
      }
      
      // Update cursor position
      this.cursorPosition = this.getCursorPosition(point, this.textLayer);
    } else {
      // Start new text layer
      this.createTextLayer(point, context);
    }
  }

  onMouseMove(point: Point, event: MouseEvent, context: ToolContext) {
    // Update cursor style over text
  }

  onKeyDown(event: KeyboardEvent, context: ToolContext) {
    if (!this.isEditing || !this.textLayer) return;
    
    const textData = this.textLayer.data.text!;
    let content = textData.content;
    let cursor = this.cursorPosition;
    let selectionStart = this.selectionStart;
    
    switch (event.key) {
      case 'Enter':
        if (!event.shiftKey) {
          event.preventDefault();
          this.commitText(context);
        } else {
          content = content.slice(0, cursor) + '\n' + content.slice(cursor);
          cursor++;
        }
        break;
      case 'Backspace':
        event.preventDefault();
        if (selectionStart !== null && selectionStart !== cursor) {
          const start = Math.min(cursor, selectionStart);
          const end = Math.max(cursor, selectionStart);
          content = content.slice(0, start) + content.slice(end);
          cursor = start;
          selectionStart = null;
        } else if (cursor > 0) {
          content = content.slice(0, cursor - 1) + content.slice(cursor);
          cursor--;
        }
        break;
      case 'Delete':
        event.preventDefault();
        if (selectionStart !== null && selectionStart !== cursor) {
          const start = Math.min(cursor, selectionStart);
          const end = Math.max(cursor, selectionStart);
          content = content.slice(0, start) + content.slice(end);
          cursor = start;
          selectionStart = null;
        } else if (cursor < content.length) {
          content = content.slice(0, cursor) + content.slice(cursor + 1);
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (event.shiftKey) {
          if (selectionStart === null) selectionStart = cursor;
          cursor = Math.max(0, cursor - 1);
        } else {
          cursor = Math.max(0, cursor - 1);
          selectionStart = null;
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (event.shiftKey) {
          if (selectionStart === null) selectionStart = cursor;
          cursor = Math.min(content.length, cursor + 1);
        } else {
          cursor = Math.min(content.length, cursor + 1);
          selectionStart = null;
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        // Move to previous line
        break;
      case 'ArrowDown':
        event.preventDefault();
        // Move to next line
        break;
      case 'Home':
        event.preventDefault();
        if (event.shiftKey) {
          if (selectionStart === null) selectionStart = cursor;
        } else {
          selectionStart = null;
        }
        cursor = 0;
        break;
      case 'End':
        event.preventDefault();
        if (event.shiftKey) {
          if (selectionStart === null) selectionStart = cursor;
        } else {
          selectionStart = null;
        }
        cursor = content.length;
        break;
      case 'Escape':
        event.preventDefault();
        this.cancelText(context);
        return;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          if (selectionStart !== null && selectionStart !== cursor) {
            const start = Math.min(cursor, selectionStart);
            const end = Math.max(cursor, selectionStart);
            content = content.slice(0, start) + event.key + content.slice(end);
            cursor = start + 1;
            selectionStart = null;
          } else {
            content = content.slice(0, cursor) + event.key + content.slice(cursor);
            cursor++;
          }
        }
        break;
    }
    
    this.cursorPosition = cursor;
    this.selectionStart = selectionStart;
    this.updateTextLayer(context, content, cursor);
  }

  onKeyUp(event: KeyboardEvent, context: ToolContext) {
    // Handle composition events for IME
  }

  private createTextLayer(point: Point, context: ToolContext) {
    const opts = context.toolOptions;
    const textData: TextData = {
      content: '',
      fontFamily: opts.fontFamily,
      fontSize: opts.fontSize,
      fontWeight: opts.fontWeight,
      fontStyle: opts.fontStyle,
      textAlign: opts.textAlign,
      leading: opts.leading,
      tracking: opts.tracking,
      color: opts.foregroundColor,
      direction: this.type === 'vertical-type' ? 'ttb' : 'ltr',
    };
    
    this.textLayer = {
      id: `layer-${Date.now()}`,
      name: 'Text Layer',
      type: 'text',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      locked: false,
      order: context.layers.length,
      transform: { x: point.x, y: point.y, scaleX: 1, scaleY: 1, rotation: 0 },
      data: { text: textData },
    };
    
    context.addLayer(this.textLayer);
    this.isEditing = true;
    this.cursorPosition = 0;
    this.selectionStart = null;
  }

  private commitText(context: ToolContext) {
    if (!this.textLayer) return;
    
    const textData = this.textLayer.data.text!;
    if (textData.content.trim() === '') {
      // Remove empty text layer
      context.removeLayer(this.textLayer.id);
    } else {
      context.pushHistory();
    }
    
    this.isEditing = false;
    this.textLayer = null;
    this.cursorPosition = 0;
    this.selectionStart = null;
  }

  private cancelText(context: ToolContext) {
    if (this.textLayer) {
      context.removeLayer(this.textLayer.id);
    }
    this.isEditing = false;
    this.textLayer = null;
    this.cursorPosition = 0;
    this.selectionStart = null;
  }

  private updateTextLayer(context: ToolContext, content: string, cursor: number) {
    if (!this.textLayer) return;
    
    this.textLayer.data.text!.content = content;
    context.updateLayer(this.textLayer.id, { data: { ...this.textLayer.data } });
  }

  private getTextBounds(layer: Layer): { x: number; y: number; width: number; height: number } {
    const textData = layer.data.text!;
    if (!textData) return { x: layer.transform.x, y: layer.transform.y, width: 0, height: 0 };
    
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.font = `${textData.fontStyle} ${textData.fontWeight} ${textData.fontSize}px ${textData.fontFamily}`;
    
    const lines = textData.content.split('\n');
    let maxWidth = 0;
    for (const line of lines) {
      const metrics = ctx.measureText(line);
      maxWidth = Math.max(maxWidth, metrics.width);
    }
    
    const lineHeight = textData.fontSize * (textData.leading / 100 || 1.2);
    const height = lines.length * lineHeight;
    
    return {
      x: layer.transform.x,
      y: layer.transform.y,
      width: maxWidth,
      height,
    };
  }

  private pointInBounds(point: Point, bounds: { x: number; y: number; width: number; height: number }): boolean {
    return point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
           point.y >= bounds.y && point.y <= bounds.y + bounds.height;
  }

  private getCursorPosition(point: Point, layer: Layer): number {
    const textData = layer.data.text!;
    if (!textData || textData.content.length === 0) return 0;
    
    const bounds = this.getTextBounds(layer);
    const relX = point.x - bounds.x;
    
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.font = `${textData.fontStyle} ${textData.fontWeight} ${textData.fontSize}px ${textData.fontFamily}`;
    
    // Simple: find closest character
    let bestPos = 0;
    let bestDist = Infinity;
    
    for (let i = 0; i <= textData.content.length; i++) {
      const substr = textData.content.slice(0, i);
      const metrics = ctx.measureText(substr);
      const dist = Math.abs(metrics.width - relX);
      if (dist < bestDist) {
        bestDist = dist;
        bestPos = i;
      }
    }
    
    return bestPos;
  }

  renderOverlay(ctx: CanvasRenderingContext2D, context: ToolContext) {
    if (this.isEditing && this.textLayer) {
      // Draw text bounds and cursor
      const bounds = this.getTextBounds(this.textLayer);
      ctx.save();
      ctx.strokeStyle = '#007acc';
      ctx.lineWidth = 1 / context.zoom;
      ctx.setLineDash([5 / context.zoom, 5 / context.zoom]);
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      
      // Draw cursor
      const textData = this.textLayer.data.text!;
      const ctx2d = document.createElement('canvas').getContext('2d')!;
      ctx2d.font = `${textData.fontStyle} ${textData.fontWeight} ${textData.fontSize}px ${textData.fontFamily}`;
      const beforeCursor = textData.content.slice(0, this.cursorPosition);
      const metrics = ctx2d.measureText(beforeCursor);
      const cursorX = bounds.x + metrics.width;
      const lineHeight = textData.fontSize * (textData.leading / 100 || 1.2);
      
      ctx.setLineDash([]);
      ctx.strokeStyle = '#007acc';
      ctx.lineWidth = 2 / context.zoom;
      ctx.beginPath();
      ctx.moveTo(cursorX, bounds.y);
      ctx.lineTo(cursorX, bounds.y + lineHeight);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// Vertical Type Tool
export class VerticalTypeTool extends TypeTool {
  type = 'vertical-type' as ToolType;
}

// Type Mask Tools (create selection from text)
export class HorizontalTypeMaskTool extends BaseTool {
  type = 'horizontal-type-mask' as ToolType;
  cursor = 'text';
  private isEditing = false;
  private textLayer: Layer | null = null;

  onMouseDown(point: Point, event: MouseEvent, context: ToolContext) {
    if (this.isEditing && this.textLayer) {
      const bounds = this.getTextBounds(this.textLayer);
      if (!this.pointInBounds(point, bounds)) {
        this.createMaskSelection(context);
        return;
      }
    } else {
      this.createTextLayer(point, context);
    }
  }

  onKeyDown(event: KeyboardEvent, context: ToolContext) {
    if (!this.isEditing || !this.textLayer) return;
    
    const textData = this.textLayer.data.text!;
    let content = textData.content;
    
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        this.createMaskSelection(context);
        break;
      case 'Backspace':
        event.preventDefault();
        content = content.slice(0, -1);
        break;
      case 'Escape':
        event.preventDefault();
        this.cancelText(context);
        return;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          content += event.key;
        }
        break;
    }
    
    this.textLayer.data.text!.content = content;
    context.updateLayer(this.textLayer.id, { data: { ...this.textLayer.data } });
  }

  private createTextLayer(point: Point, context: ToolContext) {
    const opts = context.toolOptions;
    const textData: TextData = {
      content: '',
      fontFamily: opts.fontFamily,
      fontSize: opts.fontSize,
      fontWeight: opts.fontWeight,
      fontStyle: opts.fontStyle,
      textAlign: 'left',
      leading: opts.leading,
      tracking: opts.tracking,
      color: opts.foregroundColor,
      direction: 'ltr',
    };
    
    this.textLayer = {
      id: `layer-${Date.now()}`,
      name: 'Type Mask',
      type: 'text',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      locked: false,
      order: context.layers.length,
      transform: { x: point.x, y: point.y, scaleX: 1, scaleY: 1, rotation: 0 },
      data: { text: textData },
    };
    
    context.addLayer(this.textLayer);
    this.isEditing = true;
  }

  private createMaskSelection(context: ToolContext) {
    if (!this.textLayer) return;
    
    const textData = this.textLayer.data.text!;
    if (textData.content.trim() === '') {
      context.removeLayer(this.textLayer.id);
      this.isEditing = false;
      this.textLayer = null;
      return;
    }
    
    // Convert text to vector path
    const paths = this.textToPath(this.textLayer);
    
    // Create selection from paths
    const combinedPath = this.combinePaths(paths);
    if (combinedPath.length > 0) {
      const bounds = this.getPathBounds(combinedPath);
      context.setSelection({
        type: 'path',
        bounds,
        path: combinedPath,
        feather: 0,
        antiAlias: true,
      });
    }
    
    // Remove text layer
    context.removeLayer(this.textLayer.id);
    context.pushHistory();
    
    this.isEditing = false;
    this.textLayer = null;
  }

  private cancelText(context: ToolContext) {
    if (this.textLayer) {
      context.removeLayer(this.textLayer.id);
    }
    this.isEditing = false;
    this.textLayer = null;
  }

  private getTextBounds(layer: Layer): { x: number; y: number; width: number; height: number } {
    const textData = layer.data.text!;
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.font = `${textData.fontStyle} ${textData.fontWeight} ${textData.fontSize}px ${textData.fontFamily}`;
    
    return {
      x: layer.transform.x,
      y: layer.transform.y,
      width: ctx.measureText(textData.content).width,
      height: textData.fontSize,
    };
  }

  private pointInBounds(point: Point, bounds: { x: number; y: number; width: number; height: number }): boolean {
    return point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
           point.y >= bounds.y && point.y <= bounds.y + bounds.height;
  }

  private textToPath(layer: Layer): Point[][] {
    // Simplified: would use font path extraction in real implementation
    return [];
  }

  private combinePaths(paths: Point[][]): Point[] {
    return paths.flat();
  }

  private getPathBounds(path: Point[]): { x: number; y: number; width: number; height: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of path) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  renderOverlay(ctx: CanvasRenderingContext2D, context: ToolContext) {
    // Similar to TypeTool
  }
}

export class VerticalTypeMaskTool extends HorizontalTypeMaskTool {
  type = 'vertical-type-mask' as ToolType;
}

export default {
  TypeTool,
  VerticalTypeTool,
  HorizontalTypeMaskTool,
  VerticalTypeMaskTool,
};