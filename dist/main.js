var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// if "file not found" try adding .js extensions
import { setupRightMenu } from './ui/right_menu';
import { Renderer } from './renderer/renderer';
function main() {
    return __awaiter(this, void 0, void 0, function* () {
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
        // Fetch shaders
        const vertShaderResponce = yield fetch('assets/shaders/basic_vert.glsl');
        const vertShaderSrc = yield vertShaderResponce.text();
        const fragShaderResponce = yield fetch('assets/shaders/basic_frag.glsl');
        const fragShaderSrc = yield fragShaderResponce.text();
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
        const renderer = new Renderer(gl, vertShaderSrc, fragShaderSrc);
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
    });
}
