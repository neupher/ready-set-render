import { setupRightMenu } from './ui/right_menu.js';

// Select the canvas element
const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;

// Initialize the WebGL context
const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;

if (!gl) {
  console.error('WebGL2 is not supported!');
} else {
  console.log('WebGL2 context initialized!');
}

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

// Initialize the menu
setupRightMenu(() => {
  // Placeholder for future callback when a menu item is selected
  console.log('Menu item selected.');
});