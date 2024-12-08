// if "file not found" try adding .js extensions
import { setupRightMenu } from './ui/right_menu';
import { Renderer } from './renderer/renderer';

async function main() {
  // Select the canvas element
  const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
  // Initialize the WebGL context
  const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;

  if (!gl) {
    console.error('WebGL2 is not supported!');
  } else {
    console.log('WebGL2 context initialized!');
  }

  // Fetch shaders
  const vertShaderResponce = await fetch('assets/shaders/basic_vert.glsl');
  const vertShaderSrc = await vertShaderResponce.text();

  const fragShaderResponce = await fetch('assets/shaders/basic_frag.glsl');
  const fragShaderSrc = await fragShaderResponce.text();

  // Set the canvas size
  function resizeCanvas(): void {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }

  resizeCanvas();
  // Handle window resize
  window.addEventListener('resize', resizeCanvas);

  // Set the canvas background color to black
  gl.clearColor(0.1, 0.1, 0.1, 1.0); // RGBA: Black
  gl.clear(gl.COLOR_BUFFER_BIT);

  const renderer = new Renderer(gl, vertShaderSrc, fragShaderSrc);

  function onMenuItemSelected(selection: string) {
    console.log(`Menu item selected: ${selection}`);
  
    switch (selection.toLowerCase()) {
      case 'cube':
        renderer.setPrimitive('cube');
        break;
      case 'sphere':
        renderer.setPrimitive('sphere');
        break;
      case 'line mode':
        renderer.setRenderMode('line');
        break;
      case 'webgl mode':
        renderer.setRenderMode('webgl');
        break;
      default:
        console.warn(`Unknown selection: ${selection}`);
        break;
    }
  }
  // Initialize the menu
  setupRightMenu(onMenuItemSelected);

}