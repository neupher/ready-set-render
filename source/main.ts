// if "file not found" try adding .js extensions
import { setupRightMenu } from './ui/right_menu.js';
import { Renderer } from './renderer/renderer.js';

async function main() {
  console.log('Main function started');

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
  const vertShaderPath = 'assets/shaders/basic_vert.glsl';
  const fragShaderPath = 'assets/shaders/basic_frag.glsl';

  console.log('Fetching vertex shader from:', vertShaderPath);
  const vertShaderResponce = await fetch(vertShaderPath);
  if (!vertShaderResponce.ok) {
    console.error('Failed to fetch vertex shader:', vertShaderResponce.statusText);
    return;
  }
  const vertShaderSrc = await vertShaderResponce.text();

  console.log('Fetching fragment shader from:', fragShaderPath);
  const fragShaderResponce = await fetch(fragShaderPath);
  if (!fragShaderResponce.ok) {
    console.error('Failed to fetch fragment shader:', fragShaderResponce.statusText);
    return;
  }
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

// Call the main function
main().catch(console.error);