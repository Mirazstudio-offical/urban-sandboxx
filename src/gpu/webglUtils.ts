let _cachedSoftwareWebGL: boolean | null = null;

/**
 * Detects CPU/software WebGL rasterizers (Google SwiftShader, Mesa llvmpipe/softpipe,
 * Microsoft Basic Render Driver / WARP). Running heavy multi-pass full-screen fragment
 * shaders on a CPU rasterizer drops framerate to 0.3–1 FPS; falling back to the 2D
 * canvas keeps software-rendered PCs playable while hardware GPUs (including Apple A13+
 * mobile GPUs and desktop GPUs) run WebGL2 natively at full speed.
 */
export function isSoftwareWebGL(gl: WebGL2RenderingContext): boolean {
  if (_cachedSoftwareWebGL !== null) return _cachedSoftwareWebGL;
  try {
    let renderer = '';
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      renderer = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
    }
    if (!renderer) {
      renderer = String(gl.getParameter(gl.RENDERER) || '');
    }
    const lower = renderer.toLowerCase();
    _cachedSoftwareWebGL =
      lower.includes('swiftshader') ||
      lower.includes('llvmpipe') ||
      lower.includes('softpipe') ||
      lower.includes('software rasterizer') ||
      lower.includes('microsoft basic render') ||
      lower.includes('mesa offscreen') ||
      (lower.includes('angle') && lower.includes('warp'));
  } catch {
    _cachedSoftwareWebGL = false;
  }
  return _cachedSoftwareWebGL;
}
