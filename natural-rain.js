/* A quiet rain layer for the light ESS scene. It never touches app records. */
(() => {
  const canvas = document.querySelector('.ess-natural-rain');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let w = 0, h = 0, drops = [], previous = 0, frame = 0;
  const random = (a, b) => a + Math.random() * (b - a);
  function newDrop(anywhere = false) {
    const depth = Math.random();
    return {
      x: random(-25, w + 25), y: anywhere ? random(0, h) : random(-65, -5),
      speed: random(75, 165) + depth * 185,
      drift: random(-17, -3),
      radius: depth < .7 ? random(.25, .65) : random(.6, 1.1),
      length: depth > .92 ? random(2.5, 5.5) : 0,
      alpha: random(.07, .13) + depth * .13
    };
  }
  function resize() {
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    w = innerWidth; h = innerHeight;
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drops = Array.from({length: Math.min(170, Math.max(70, Math.round(w * h / 9500)))}, () => newDrop(true));
  }
  function draw(time) {
    frame = requestAnimationFrame(draw);
    if (document.hidden || document.body.classList.contains('theme-night') || reduced.matches) {
      ctx.clearRect(0, 0, w, h);
      previous = time;
      return;
    }
    if (time - previous < 30) return;
    const dt = Math.min((time - (previous || time)) / 1000, .05);
    previous = time;
    ctx.clearRect(0, 0, w, h);
    drops.forEach((drop, i) => {
      drop.x += drop.drift * dt;
      drop.y += drop.speed * dt;
      if (drop.y > h + 12 || drop.x < -25) drops[i] = newDrop();
      ctx.fillStyle = `rgba(222,239,250,${drop.alpha})`;
      ctx.beginPath();
      ctx.ellipse(drop.x, drop.y, drop.radius, drop.radius + drop.length, -.12, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  addEventListener('resize', resize, {passive: true});
  resize();
  frame = requestAnimationFrame(draw);
})();
