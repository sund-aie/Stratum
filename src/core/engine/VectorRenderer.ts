/**
 * Stratum Vector Renderer
 * SVG-based vector rendering engine
 */

import type { VectorPath, AnchorPoint, FillStyle, StrokeStyle, RGBAColor, GradientData } from '../../types';

export class VectorRenderer {
  private svg: SVGSVGElement | null = null;
  private defs: SVGDefsElement | null = null;

  constructor(container: HTMLElement) {
    this.init(container);
  }

  private init(container: HTMLElement): void {
    const ns = 'http://www.w3.org/2000/svg';
    
    this.svg = document.createElementNS(ns, 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.setAttribute('overflow', 'visible');
    
    this.defs = document.createElementNS(ns, 'defs');
    this.svg.appendChild(this.defs);
    
    container.appendChild(this.svg);
  }

  /**
   * Render a vector path to SVG
   */
  renderPath(path: VectorPath): SVGPathElement {
    if (!this.svg) throw new Error('SVG not initialized');

    const ns = 'http://www.w3.org/2000/svg';
    const pathElement = document.createElementNS(ns, 'path');
    
    const d = this.pathToSVG(path);
    pathElement.setAttribute('d', d);

    // Apply fill
    if (path.fill) {
      this.applyFill(pathElement, path.fill);
    }

    // Apply stroke
    if (path.stroke) {
      this.applyStroke(pathElement, path.stroke);
    }

    return pathElement;
  }

  /**
   * Convert VectorPath to SVG path data string
   */
  private pathToSVG(path: VectorPath): string {
    if (path.points.length === 0) return '';

    let d = '';
    const first = path.points[0];

    // Move to first point
    d += `M ${first.x} ${first.y}`;

    // Draw curves to subsequent points
    for (let i = 1; i < path.points.length; i++) {
      const point = path.points[i];
      
      if (point.handleIn && point.handleOut) {
        // Bezier curve with handles
        const prev = path.points[i - 1];
        const cp1x = prev.x + (prev.handleOut?.x || 0);
        const cp1y = prev.y + (prev.handleOut?.y || 0);
        const cp2x = point.x + (point.handleIn?.x || 0);
        const cp2y = point.y + (point.handleIn?.y || 0);
        
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
      } else {
        // Line to point
        d += ` L ${point.x} ${point.y}`;
      }
    }

    // Close path if needed
    if (path.closed) {
      d += ' Z';
    }

    return d;
  }

  /**
   * Apply fill style to SVG element
   */
  private applyFill(element: SVGPathElement, fill: FillStyle): void {
    switch (fill.type) {
      case 'solid':
        if (fill.color) {
          element.setAttribute('fill', this.colorToString(fill.color));
          element.setAttribute('fill-opacity', fill.opacity.toString());
        }
        break;

      case 'gradient':
        if (fill.gradient) {
          const gradientId = this.createGradient(fill.gradient);
          element.setAttribute('fill', `url(#${gradientId})`);
          element.setAttribute('fill-opacity', fill.opacity.toString());
        }
        break;

      case 'pattern':
        // Pattern support would go here
        element.setAttribute('fill', '#808080');
        break;
    }
  }

  /**
   * Apply stroke style to SVG element
   */
  private applyStroke(element: SVGPathElement, stroke: StrokeStyle): void {
    element.setAttribute('stroke', this.colorToString(stroke.color));
    element.setAttribute('stroke-width', stroke.width.toString());
    element.setAttribute('stroke-opacity', stroke.opacity.toString());
    element.setAttribute('stroke-linecap', stroke.lineCap);
    element.setAttribute('stroke-linejoin', stroke.lineJoin);
    element.setAttribute('stroke-miterlimit', stroke.miterLimit.toString());

    if (stroke.dashArray) {
      element.setAttribute('stroke-dasharray', stroke.dashArray.join(','));
    }
  }

  /**
   * Create SVG gradient definition
   */
  private createGradient(gradient: GradientData): string {
    if (!this.defs) return '';

    const ns = 'http://www.w3.org/2000/svg';
    const id = `gradient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let gradientElement: SVGLinearGradientElement | SVGRadialGradientElement;

    if (gradient.type === 'linear') {
      gradientElement = document.createElementNS(ns, 'linearGradient');
      gradientElement.setAttribute('x1', gradient.startX.toString());
      gradientElement.setAttribute('y1', gradient.startY.toString());
      gradientElement.setAttribute('x2', gradient.endX.toString());
      gradientElement.setAttribute('y2', gradient.endY.toString());
    } else {
      gradientElement = document.createElementNS(ns, 'radialGradient');
      // Radial gradient attributes would go here
    }

    gradientElement.setAttribute('id', id);

    // Add stops
    gradient.stops.forEach((stop) => {
      const stopElement = document.createElementNS(ns, 'stop');
      stopElement.setAttribute('offset', `${stop.offset * 100}%`);
      stopElement.setAttribute('stop-color', this.colorToString(stop.color));
      stopElement.setAttribute('stop-opacity', stop.color.a.toString());
      gradientElement.appendChild(stopElement);
    });

    this.defs.appendChild(gradientElement);
    return id;
  }

  /**
   * Convert RGBAColor to CSS color string
   */
  private colorToString(color: RGBAColor): string {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
  }

  /**
   * Clear all paths
   */
  clear(): void {
    if (!this.svg || !this.defs) return;
    
    // Remove all elements except defs
    Array.from(this.svg.children).forEach((child) => {
      if (child !== this.defs) {
        this.svg!.removeChild(child);
      }
    });
  }

  /**
   * Calculate bounding box of a path
   */
  static getPathBounds(path: VectorPath): { x: number; y: number; width: number; height: number } {
    if (path.points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const point of path.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);

      // Include control points
      if (point.handleIn) {
        minX = Math.min(minX, point.x + point.handleIn.x);
        minY = Math.min(minY, point.y + point.handleIn.y);
        maxX = Math.max(maxX, point.x + point.handleIn.x);
        maxY = Math.max(maxY, point.y + point.handleIn.y);
      }
      if (point.handleOut) {
        minX = Math.min(minX, point.x + point.handleOut.x);
        minY = Math.min(minY, point.y + point.handleOut.y);
        maxX = Math.max(maxX, point.x + point.handleOut.x);
        maxY = Math.max(maxY, point.y + point.handleOut.y);
      }
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Check if a point is on a line segment
   */
  static pointOnLine(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    tolerance: number = 1
  ): boolean {
    const distance = Math.abs((y2 - y1) * px - (x2 - x1) * py + x2 * y1 - y2 * x1) / 
                     Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);
    return distance <= tolerance;
  }

  /**
   * Check if a point is inside a polygon
   */
  static pointInPolygon(px: number, py: number, points: AnchorPoint[]): boolean {
    let inside = false;
    const n = points.length;
    
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = points[i].x;
      const yi = points[i].y;
      const xj = points[j].x;
      const yj = points[j].y;

      if (((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Export paths to SVG string
   */
  exportToSVG(paths: VectorPath[], width: number, height: number): string {
    const ns = 'http://www.w3.org/2000/svg';
    let svgContent = `<svg xmlns="${ns}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
    svgContent += '<defs>';

    // Add gradients
    paths.forEach((path) => {
      if (path.fill?.type === 'gradient' && path.fill.gradient) {
        // Gradient definitions would be added here
      }
    });

    svgContent += '</defs>';

    // Add paths
    paths.forEach((path) => {
      svgContent += `<path d="${this.pathToSVG(path)}" `;
      
      if (path.fill?.type === 'solid' && path.fill.color) {
        svgContent += `fill="${this.colorToString(path.fill.color)}" `;
        svgContent += `fill-opacity="${path.fill.opacity}" `;
      }
      
      if (path.stroke) {
        svgContent += `stroke="${this.colorToString(path.stroke.color)}" `;
        svgContent += `stroke-width="${path.stroke.width}" `;
      }
      
      svgContent += '/>';
    });

    svgContent += '</svg>';
    return svgContent;
  }
}
