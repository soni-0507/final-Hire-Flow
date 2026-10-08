/** A short burst of confetti, used when a candidate is hired. Skipped for users who prefer reduced motion. */
export function celebrate() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#2f66e8', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#14b8a6'];
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:70';
  for (let i = 0; i < 80; i++) {
    const p = document.createElement('span');
    const size = 6 + Math.random() * 7;
    p.style.cssText = `position:absolute;top:-14px;left:${Math.random() * 100}%;width:${size}px;height:${size * 0.45}px;background:${colors[i % colors.length]};border-radius:2px`;
    layer.appendChild(p);
    p.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${(Math.random() - 0.5) * 260}px,${window.innerHeight + 40}px) rotate(${Math.random() * 720}deg)`, opacity: 0.9 },
      ],
      { duration: 1600 + Math.random() * 1500, easing: 'cubic-bezier(.2,.6,.4,1)', delay: Math.random() * 350, fill: 'forwards' }
    );
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 3800);
}
