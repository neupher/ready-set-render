export class LineRenderer {
    constructor(ctx) {
        this.ctx = ctx;
    }
    drawLine(x1, y1, x2, y2, color) {
        this.ctx.strokeStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }
}
