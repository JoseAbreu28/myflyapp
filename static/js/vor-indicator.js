/* Standalone standard VOR indicator demo. Planning/training aid only; not certified. */
(function (global) {
  "use strict";
  const normalize = (degrees) => ((Number(degrees) % 360) + 360) % 360;

  class VORIndicator {
    constructor(canvas, options = {}) {
      if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError("VORIndicator requires a canvas element.");
      this.canvas = canvas; this.ctx = canvas.getContext("2d");
      this.state = {course: 90, deviation: 0, flag: "TO", ...options}; this.draw();
    }
    setState(values) { Object.assign(this.state, values); this.draw(); return this; }
    draw() {
      const {canvas, ctx} = this; const scale = Math.min(canvas.width, canvas.height) / 360;
      const course = normalize(this.state.course); const deviation = Math.max(-2, Math.min(2, Number(this.state.deviation) || 0));
      const flag = ["TO", "FROM", "OFF"].includes(this.state.flag) ? this.state.flag : "OFF";
      ctx.setTransform(scale, 0, 0, scale, canvas.width / 2, canvas.height / 2); ctx.clearRect(-180, -180, 360, 360);
      const glow = ctx.createRadialGradient(-35, -45, 20, 0, 0, 166);
      glow.addColorStop(0, "#26364a"); glow.addColorStop(0.6, "#101820"); glow.addColorStop(1, "#05080c");
      ctx.beginPath(); ctx.arc(0, 0, 166, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = "#536170"; ctx.stroke();
      ctx.fillStyle = "#f8fafc"; ctx.font = "700 22px monospace"; ctx.textAlign = "center";
      ctx.fillText(String(Math.round(course)).padStart(3, "0"), 0, -108);
      ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 28, 3, 4, 0, Math.PI * 2); ctx.stroke(); }
      const x = deviation * 28; ctx.strokeStyle = "#f8fafc"; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(x, -68); ctx.lineTo(x, 75); ctx.stroke();
      ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-52, 3); ctx.lineTo(52, 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 15); ctx.stroke();
      ctx.strokeStyle = flag === "OFF" ? "#ef4444" : "#f8fafc"; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 3;
      if (flag === "TO") { ctx.beginPath(); ctx.moveTo(82, 24); ctx.lineTo(82, -35); ctx.moveTo(70, -22); ctx.lineTo(82, -36); ctx.lineTo(94, -22); ctx.stroke(); }
      if (flag === "FROM") { ctx.beginPath(); ctx.moveTo(82, -34); ctx.lineTo(82, 25); ctx.moveTo(70, 12); ctx.lineTo(82, 26); ctx.lineTo(94, 12); ctx.stroke(); }
      ctx.font = "700 16px monospace"; ctx.textAlign = "center"; ctx.fillText(flag === "OFF" ? "NAV" : flag, 82, 54);
      ctx.font = "700 13px sans-serif"; ctx.fillStyle = "#94a3b8"; ctx.fillText("VOR", 0, 132);
    }
  }
  global.VORIndicator = VORIndicator;
})(window);
