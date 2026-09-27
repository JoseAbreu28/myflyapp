/* Standalone HSI demo. Planning/training aid only; not a certified instrument. */
(function (global) {
  "use strict";

  const rad = (degrees) => degrees * Math.PI / 180;
  const normalize = (degrees) => ((Number(degrees) % 360) + 360) % 360;

  class HSIInstrument {
    constructor(canvas, options = {}) {
      if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError("HSIInstrument requires a canvas element.");
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.state = {heading: 45, course: 90, deviation: 0, ...options};
      this.draw();
    }

    setState(values) { Object.assign(this.state, values); this.draw(); return this; }

    draw() {
      const {canvas, ctx} = this;
      const scale = Math.min(canvas.width, canvas.height) / 360;
      const heading = normalize(this.state.heading);
      const course = normalize(this.state.course);
      const deviation = Math.max(-2, Math.min(2, Number(this.state.deviation) || 0));
      ctx.setTransform(scale, 0, 0, scale, canvas.width / 2, canvas.height / 2);
      ctx.clearRect(-180, -180, 360, 360);
      const glow = ctx.createRadialGradient(-35, -45, 20, 0, 0, 166);
      glow.addColorStop(0, "#26364a"); glow.addColorStop(0.6, "#101820"); glow.addColorStop(1, "#05080c");
      ctx.beginPath(); ctx.arc(0, 0, 166, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();
      ctx.lineWidth = 7; ctx.strokeStyle = "#536170"; ctx.stroke();
      ctx.save(); ctx.rotate(-rad(heading));
      for (let d = 0; d < 360; d += 5) {
        ctx.save(); ctx.rotate(rad(d));
        const major = d % 30 === 0;
        ctx.beginPath(); ctx.moveTo(0, -148); ctx.lineTo(0, -148 + (major ? 16 : d % 10 === 0 ? 10 : 5));
        ctx.strokeStyle = major ? "#f8fafc" : "#94a3b8"; ctx.lineWidth = major ? 2 : 1; ctx.stroke();
        if (major) {
          const labels = {0: "N", 90: "E", 180: "S", 270: "W"};
          ctx.translate(0, -119); ctx.rotate(rad(heading - d));
          ctx.fillStyle = "#f8fafc"; ctx.font = "700 17px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(labels[d] || String(d / 10).padStart(2, "0"), 0, 0);
        }
        ctx.restore();
      }
      ctx.restore();
      ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.moveTo(0, -151); ctx.lineTo(-9, -137); ctx.lineTo(9, -137); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.rotate(rad(course - heading));
      ctx.strokeStyle = "#d946ef"; ctx.fillStyle = "#d946ef"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, -115); ctx.lineTo(-9, -94); ctx.lineTo(9, -94); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, 94); ctx.lineTo(0, 116); ctx.stroke();
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 22, 0, 3, 0, Math.PI * 2); ctx.fillStyle = "#e2e8f0"; ctx.fill(); }
      ctx.translate(deviation * 22, 0); ctx.beginPath(); ctx.moveTo(0, -86); ctx.lineTo(0, 86); ctx.strokeStyle = "#d946ef"; ctx.lineWidth = 5; ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-48, 0); ctx.lineTo(-15, 0); ctx.lineTo(0, 9); ctx.lineTo(15, 0); ctx.lineTo(48, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(0, 27); ctx.stroke();
      ctx.fillStyle = "#f8fafc"; ctx.font = "700 14px monospace"; ctx.textAlign = "center";
      ctx.fillText(`HDG ${String(Math.round(heading)).padStart(3, "0")}  CRS ${String(Math.round(course)).padStart(3, "0")}`, 0, 130);
    }
  }

  global.HSIInstrument = HSIInstrument;
})(window);
