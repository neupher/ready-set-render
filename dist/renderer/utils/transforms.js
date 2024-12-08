export function projectToScreen(x, y, z, width, height) {
    // placeholder: scale and center the object
    const scale = Math.min(width, height) / 2;
    const sx = (x * scale) + (width / 2);
    const sy = (-y * scale) + (height / 2);
    return [sx, sy];
}
