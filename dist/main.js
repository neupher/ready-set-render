// if "file not found" try adding .js extensions
import { setupRightMenu } from './ui/right_menu';
import { Renderer } from './renderer/renderer';
// Select the canvas element
const canvas = document.getElementById('webgl-canvas');
// Initialize the WebGL context
const gl = canvas.getContext('webgl2');
if (!gl) {
    console.error('WebGL2 is not supported!');
}
else {
    console.log('WebGL2 context initialized!');
}
// Set the canvas size
function resizeCanvas() {
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
const renderer = new Renderer(canvas);
function onMenuItemSelected(selection) {
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
