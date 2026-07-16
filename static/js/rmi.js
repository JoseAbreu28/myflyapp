/* Standalone RMI demo. Planning/training aid only; not a certified instrument. */
(function (global) {
  "use strict";

  const rad = (degrees) => degrees * Math.PI / 180;
  const normalize = (degrees) => ((Number(degrees) % 360) + 360) % 360;

  class RMIInstrument {
    constructor(canvas, options = {}) {
      if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError("RMIInstrument requires a canvas element.");
      this.canvas = canvas; this.ctx = canvas.getContext("2d");
      this.state = {heading: 45, vorBearing: 110, adfBearing: 285, ...options};
      this.draw();
    }
    setState(values) { Object.assign(this.state, values); this.draw(); return this; }
    needle(ctx, angle, color, doubleNeedle) {
      ctx.save(); ctx.rotate(rad(angle)); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = doubleNeedle ? 5 : 3;
      ctx.beginPath(); ctx.moveTo(0, doubleNeedle ? 108 : 120); ctx.lineTo(0, -105); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -126); ctx.lineTo(-8, -101); ctx.lineTo(8, -101); ctx.closePath(); ctx.fill();
      if (doubleNeedle) { ctx.beginPath(); ctx.moveTo(-7, 102); ctx.lineTo(0, 116); ctx.lineTo(7, 102); ctx.stroke(); }
      ctx.restore();
    }
    draw() {
      const {canvas, ctx} = this; const scale = Math.min(canvas.width, canvas.height) / 360;
      const heading = normalize(this.state.heading);
      ctx.setTransform(scale, 0, 0, scale, canvas.width / 2, canvas.height / 2); ctx.clearRect(-180, -180, 360, 360);
      const glow = ctx.createRadialGradient(-35, -45, 20, 0, 0, 166);
      glow.addColorStop(0, "#26364a"); glow.addColorStop(0.6, "#101820"); glow.addColorStop(1, "#05080c");
      ctx.beginPath(); ctx.arc(0, 0, 166, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = "#536170"; ctx.stroke();
      ctx.save(); ctx.rotate(-rad(heading));
      for (let d = 0; d < 360; d += 5) {
        ctx.save(); ctx.rotate(rad(d)); const major = d % 30 === 0;
        ctx.beginPath(); ctx.moveTo(0, -148); ctx.lineTo(0, -148 + (major ? 16 : d % 10 === 0 ? 10 : 5));
        ctx.strokeStyle = major ? "#f8fafc" : "#94a3b8"; ctx.lineWidth = major ? 2 : 1; ctx.stroke();
        if (major) {
          const labels = {0: "N", 90: "E", 180: "S", 270: "W"};
          ctx.translate(0, -119); ctx.rotate(rad(heading - d)); ctx.fillStyle = "#f8fafc";
          ctx.font = "700 17px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(labels[d] || String(d / 10).padStart(2, "0"), 0, 0);
        } ctx.restore();
      } ctx.restore();
      ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.moveTo(0, -151); ctx.lineTo(-9, -137); ctx.lineTo(9, -137); ctx.closePath(); ctx.fill();
      this.needle(ctx, normalize(this.state.vorBearing) - heading, "#22c55e", true);
      this.needle(ctx, normalize(this.state.adfBearing) - heading, "#60a5fa", false);
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fillStyle = "#e2e8f0"; ctx.fill();
      ctx.font = "700 13px monospace"; ctx.fillStyle = "#22c55e"; ctx.textAlign = "left"; ctx.fillText("VOR", -110, 132);
      ctx.fillStyle = "#60a5fa"; ctx.textAlign = "right"; ctx.fillText("ADF", 110, 132);
    }
  }
  global.RMIInstrument = RMIInstrument;
})(window);
