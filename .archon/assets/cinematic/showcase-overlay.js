/* Showcase scroll-frame + text-overlay engine.
   Vendored from cinematic-site-kit-higgsfield SKILL.md §2E.

   §2E provides the updateOverlays(progress) function and the overlay CSS VERBATIM, but it does
   NOT ship a standalone showcase scroll-frame engine — it states the showcase section is
   "identical in structure to the hero ... separate canvas, separate frame set, and separate
   scroll engine instance." So the scroll/preload/rAF engine below is adapted from the §3B hero
   engine (canvas mode), retargeted to #showcase-canvas / #showcase-section and the
   showcase-frames/frame_%04d.jpg path, and its render loop calls updateOverlays(progress).

   Build-time tokens (filled by assemble-site.ts):
     __SHOWCASE_FRAME_COUNT__ — number of showcase frames (frames-count.json.showcase_frames)
     __SHOWCASE_OVERLAYS__    — JSON array of {text,start,end} caption descriptors (§2E).
   The whole section is only emitted when frames-count.showcase_frames > 0. */

(function(){
  const canvas = document.getElementById('showcase-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const frameCount = __SHOWCASE_FRAME_COUNT__;
  const frames = [];
  let loaded = 0;

  // --- §2E text overlays: appear/disappear at specific scroll progress points ---
  const overlays = __SHOWCASE_OVERLAYS__;

  function updateOverlays(progress) {
    overlays.forEach((o, i) => {
      const el = document.getElementById('overlay-' + i);
      if (!el) return;
      if (progress >= o.start && progress <= o.end) {
        el.style.opacity = '1';
        el.style.transform = 'translateX(-50%) translateY(0)';
      } else {
        el.style.opacity = '0';
        el.style.transform = 'translateX(-50%) translateY(20px)';
      }
    });
  }

  // Preload all showcase frames (engine structure mirrors §3B hero engine)
  for(let i = 1; i <= frameCount; i++){
    const img = new Image();
    img.src = 'showcase-frames/frame_' + String(i).padStart(4, '0') + '.jpg';
    img.onload = () => { loaded++; if(loaded === frameCount) requestAnimationFrame(render); };
    frames.push(img);
  }

  function render(){
    const section = document.getElementById('showcase-section');
    const rect = section.getBoundingClientRect();
    const scrollHeight = section.offsetHeight - window.innerHeight;
    const progress = Math.min(Math.max(-rect.top / scrollHeight, 0), 1);
    const frameIndex = Math.min(Math.floor(progress * (frameCount - 1)), frameCount - 1);

    // Size canvas to display size × pixel ratio for crisp rendering
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const img = frames[frameIndex];
    if(img && img.complete){
      // Cover-fit the frame to canvas
      const cw = canvas.offsetWidth, ch = canvas.offsetHeight;
      const iw = img.width, ih = img.height;
      const scale = Math.max(cw / iw, ch / ih);
      const dx = (cw - iw * scale) / 2;
      const dy = (ch - ih * scale) / 2;
      ctx.drawImage(img, dx, dy, iw * scale, ih * scale);
    }

    updateOverlays(progress);
    requestAnimationFrame(render);
  }
})();
