/**
 * Screen <-> artboard coordinate transform (B16).
 *
 * Drawing convention (see CanvasEngine.render): the context is scaled by DPR once
 * (setTransform(dpr,0,0,dpr,0,0)), then translate(pan) scale(zoom). So pan is in CSS
 * pixels, zoom is unitless, and artboard coordinates map 1:1 to image pixels.
 */

export interface ViewTransform {
  zoom: number;
  panX: number;
  panY: number;
  /** Artboard origin in artboard space (usually 0,0). */
  originX: number;
  originY: number;
}

/** Client (event) coords -> artboard pixel coords. `rect` is canvas.getBoundingClientRect(). */
export function screenToArtboard(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number },
  vt: ViewTransform
): { x: number; y: number } {
  const cx = clientX - rect.left;
  const cy = clientY - rect.top;
  return {
    x: (cx - vt.panX) / vt.zoom - vt.originX,
    y: (cy - vt.panY) / vt.zoom - vt.originY,
  };
}

/** Artboard pixel coords -> CSS pixels relative to the canvas top-left. */
export function artboardToScreen(
  ax: number,
  ay: number,
  vt: ViewTransform
): { x: number; y: number } {
  return {
    x: (ax + vt.originX) * vt.zoom + vt.panX,
    y: (ay + vt.originY) * vt.zoom + vt.panY,
  };
}
