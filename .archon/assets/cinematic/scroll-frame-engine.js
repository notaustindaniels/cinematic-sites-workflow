/* Scroll-Frame Engine — vendored from cinematic-site-kit-higgsfield SKILL.md §3B
   (sticky-canvas scroll→frame playback engine, canvas mode).

   Adapted in exactly two ways from the skill source:
     1. frameCount is the literal build-time token __FRAME_COUNT__
        (the assembler replaces it with frames-count.json.hero_frames).
     2. frames load from the path pattern frames/frame_%04d.jpg
        (zero-padded to 4 digits, 1-indexed), built in JS via padStart(4,'0').
   All scroll math, preloading, and rAF logic is kept exactly as in the skill. */
(function(){
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d');
  const frameCount = __FRAME_COUNT__; // replaced at build time with actual count
  const frames = [];
  let loaded = 0;

  // Preload all frames
  for(let i = 1; i <= frameCount; i++){
    const img = new Image();
    img.src = 'frames/frame_' + String(i).padStart(4, '0') + '.jpg';
    img.onload = () => { loaded++; if(loaded === frameCount) requestAnimationFrame(render); };
    frames.push(img);
  }

  function render(){
    const section = document.getElementById('hero-section');
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
    requestAnimationFrame(render);
  }
})();
