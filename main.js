const canvas = document.getElementById("webgl-canvas");

// Initialize the WebGL context
const gl = canvas.getContext("webgl2");

if (!gl) {
  alert("WebGL2 not supported in this browser/device!");
} else {
  console.log("WebGL initialized successfully!");
}

// Set the canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Set up the viewport
gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

// Clear the canvas
gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

// Allow for resizing
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
});