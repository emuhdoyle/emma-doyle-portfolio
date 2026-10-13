const intro = document.querySelector('.intro');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

document.querySelectorAll('.project').forEach((project) => {
  if (!project.querySelector('a')) project.tabIndex = 0;
});

const projectGrid = document.querySelector('.project-grid');

if (projectGrid) {
  let alignmentFrame = 0;

  function alignProjectServices() {
    cancelAnimationFrame(alignmentFrame);
    alignmentFrame = requestAnimationFrame(() => {
      const projects = [...projectGrid.querySelectorAll('.project')];

      projects.forEach((project) => {
        const title = project.querySelector('h3');
        const description = project.querySelector('p:not(.tags):not(.status)');
        if (title) title.style.minHeight = '';
        if (description) description.style.minHeight = '';
      });

      const rows = [];
      projects.forEach((project) => {
        const top = Math.round(project.offsetTop);
        let row = rows.find((candidate) => Math.abs(candidate.top - top) <= 1);
        if (!row) {
          row = { top, projects:[] };
          rows.push(row);
        }
        row.projects.push(project);
      });

      rows.forEach((row) => {
        if (row.projects.length < 2) return;
        const titles = row.projects.map((project) => project.querySelector('h3')).filter(Boolean);
        const descriptions = row.projects
          .map((project) => project.querySelector('p:not(.tags):not(.status)'))
          .filter(Boolean);
        const titleHeight = Math.max(...titles.map((title) => title.getBoundingClientRect().height));
        const descriptionHeight = Math.max(
          ...descriptions.map((description) => description.getBoundingClientRect().height)
        );

        titles.forEach((title) => { title.style.minHeight = `${titleHeight}px`; });
        descriptions.forEach((description) => {
          description.style.minHeight = `${descriptionHeight}px`;
        });
      });
    });
  }

  alignProjectServices();
  document.fonts?.ready.then(alignProjectServices);
  window.addEventListener('resize',alignProjectServices,{passive:true});
}

if (intro) {
  const modes = reducedMotion
    ? ['flip', 'shapes']
    : ['gravity', 'multiply', 'flip', 'shapes'];
  let previous = '';
  try { previous = sessionStorage.getItem('emma-intro-mode') || ''; } catch (_) {}
  const choices = modes.filter((mode) => mode !== previous);
  const mode = choices[Math.floor(Math.random() * choices.length)] || modes[0];
  try { sessionStorage.setItem('emma-intro-mode', mode); } catch (_) {}
  intro.dataset.mode = mode;

  const targets = intro.querySelectorAll('.intro-statement, .holding-note, .headline, .contact, .bio');

  function letterize(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const fragment = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          fragment.appendChild(document.createTextNode(part));
          return;
        }
        const word = document.createElement('span');
        word.className = 'letter-word';
        [...part].forEach((character) => {
          const letter = document.createElement('span');
          letter.className = 'intro-letter';
          letter.textContent = character;
          word.appendChild(letter);
        });
        fragment.appendChild(word);
      });
      node.replaceWith(fragment);
    });
  }

  function initGravity() {
    const sources = [...intro.querySelectorAll(
      '.intro-statement, .holding-note, .headline, .contact, .bio > h2, .bio > p'
    )];
    const sectionRect = intro.getBoundingClientRect();
    const layer = document.createElement('div');
    layer.className = 'gravity-layer';
    layer.setAttribute('aria-hidden', 'true');
    intro.appendChild(layer);

    const bodies = sources.map((source, index) => {
      const rect = source.getBoundingClientRect();
      const computed = getComputedStyle(source);
      const clone = source.cloneNode(true);
      clone.classList.add('gravity-chunk');
      clone.style.left = `${rect.left - sectionRect.left}px`;
      clone.style.top = `${rect.top - sectionRect.top}px`;
      clone.style.width = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
      clone.style.fontSize = computed.fontSize;
      clone.style.fontWeight = computed.fontWeight;
      clone.style.fontStyle = computed.fontStyle;
      clone.style.lineHeight = computed.lineHeight;
      clone.style.letterSpacing = computed.letterSpacing;
      clone.style.textAlign = computed.textAlign;
      layer.appendChild(clone);
      source.classList.add('gravity-source');

      let gapAbove = parseFloat(computed.marginTop) || 0;
      if (source.matches('.bio > h2')) {
        gapAbove = parseFloat(getComputedStyle(source.parentElement).marginTop) || gapAbove;
      }

      return {
        el:clone,
        order:index,
        originX:rect.left - sectionRect.left,
        originY:rect.top - sectionRect.top,
        x:rect.left - sectionRect.left,
        y:rect.top - sectionRect.top,
        width:rect.width,
        height:rect.height,
        gapAbove,
        vx:(Math.random() - .5) * .22,
        vy:0,
        angle:0,
        angularVelocity:0,
        lastImpact:0,
        release:performance.now() + 500 + index * 85,
        released:false
      };
    });

    const pointer = { x:0, y:0, previousX:0, previousY:0, time:0, active:false };

    function nudgeWithPointer(event, isPress = false) {
      const rect = intro.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const elapsed = Math.max(8,Math.min(48,event.timeStamp - pointer.time || 16));
      const frameScale = 16.67 / elapsed;
      const moveX = pointer.active ? (x - pointer.x) * frameScale : 0;
      const moveY = pointer.active ? (y - pointer.y) * frameScale : 0;
      const speed = Math.hypot(moveX,moveY);
      const radius = Math.max(28,Math.min(52,intro.clientWidth * .035));
      const now = performance.now();

      pointer.previousX = pointer.x;
      pointer.previousY = pointer.y;
      pointer.x = x;
      pointer.y = y;
      pointer.time = event.timeStamp;
      pointer.active = true;

      if (!isPress && speed < .35) return;

      bodies.forEach((body) => {
        const closestX = Math.max(body.x,Math.min(x,body.x + body.width));
        const closestY = Math.max(body.y,Math.min(y,body.y + body.height));
        const distance = Math.hypot(x - closestX,y - closestY);
        if (distance > radius || now - body.lastImpact < 34) return;

        body.released = true;
        body.release = now;
        body.lastImpact = now;

        const influence = isPress ? 1 : 1 - distance / radius;
        const centreX = body.x + body.width / 2;
        const centreY = body.y + body.height / 2;
        const leverX = (x - centreX) / Math.max(1,body.width / 2);
        const leverY = (y - centreY) / Math.max(1,body.height / 2);
        const direction = x < centreX ? 1 : -1;

        body.vx += (isPress ? direction * .8 : moveX * .105) * influence;
        body.vy += (isPress ? -.35 : moveY * .035) * influence;
        body.angularVelocity += (
          (isPress ? direction * .34 : moveX * leverY * .026 - moveY * leverX * .012)
          * influence
        );
        body.vx = Math.max(-5.5,Math.min(5.5,body.vx));
        body.vy = Math.max(-2.5,Math.min(7,body.vy));
        body.angularVelocity = Math.max(-.85,Math.min(.85,body.angularVelocity));
      });
    }

    intro.addEventListener('pointermove',nudgeWithPointer,{passive:true});
    intro.addEventListener('pointerdown',(event) => nudgeWithPointer(event,true),{passive:true});
    intro.addEventListener('pointerleave',() => { pointer.active = false; });

    function resolveStacking(height) {
      const released = bodies
        .filter((body) => body.released)
        .sort((a,b) => b.order - a.order);
      let floor = height;

      released.forEach((body) => {
        const restingY = floor - body.height;
        if (body.y > restingY) {
          body.y = restingY;
          body.vy = 0;
          body.vx *= .88;
          body.angularVelocity *= .68;
        }
        floor = Math.min(floor,body.y - Math.max(14,body.gapAbove));
      });
    }

    let last = performance.now();
    function frame(now) {
      const dt = Math.min(2,(now - last) / 16.67 || 1);
      last = now;
      const width = intro.clientWidth;
      const height = intro.clientHeight;
      bodies.forEach((body) => {
        if (now < body.release) return;
        body.released = true;
        body.vy += .16 * dt;
        body.x += body.vx * dt;
        body.y += body.vy * dt;
        body.angle += body.angularVelocity * dt;
        body.angularVelocity *= Math.pow(.965,dt);
        body.vx *= Math.pow(.997,dt);
        if (body.angle < -7) { body.angle = -7; body.angularVelocity = Math.abs(body.angularVelocity) * .18; }
        if (body.angle > 7) { body.angle = 7; body.angularVelocity = -Math.abs(body.angularVelocity) * .18; }
        if (body.x < 0) {
          body.x = 0;
          body.vx = Math.abs(body.vx) * .15;
          body.angularVelocity += .035;
        }
        if (body.x + body.width > width) {
          body.x = width - body.width;
          body.vx = -Math.abs(body.vx) * .15;
          body.angularVelocity -= .035;
        }
        if (body.y + body.height > height) {
          body.y = height - body.height;
          body.vy = 0;
          body.vx *= .88;
          body.angularVelocity *= .68;
        }
        if (Math.abs(body.vx) < .08 && Math.abs(body.vy) < .08) body.angle *= Math.pow(.992,dt);
      });

      resolveStacking(height);

      bodies.forEach((body) => {
        body.el.style.transform = `translate3d(${body.x - body.originX}px,${body.y - body.originY}px,0) rotate(${body.angle}deg)`;
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (mode === 'gravity') {
    const startGravity = () => requestAnimationFrame(initGravity);
    if (document.fonts?.ready) document.fonts.ready.then(startGravity,startGravity);
    else startGravity();
  } else {
    targets.forEach(letterize);
  }

  let lastDuplicate = 0;

  function duplicate(letter) {
    const count = Number(letter.dataset.copies || 0);
    if (count >= 10) return;
    const copy = document.createElement('span');
    copy.className = 'letter-copy';
    copy.setAttribute('aria-hidden', 'true');
    copy.textContent = letter.firstChild?.nodeValue || letter.textContent.charAt(0);
    letter.appendChild(copy);
    letter.dataset.copies = String(count + 1);
  }


  function shape(letter) {
    const shapes = [
      ['0','0deg','1'],
      ['0','45deg','1'],
      ['0','0deg','.62'],
      ['50%','0deg','1.55']
    ];
    const selected = shapes[Math.floor(Math.random() * shapes.length)];
    letter.style.setProperty('--shape-radius', selected[0]);
    letter.style.setProperty('--shape-rotation', selected[1]);
    letter.style.setProperty('--shape-width', selected[2]);
    letter.classList.add('is-shape');
  }

  intro.addEventListener('pointerover', (event) => {
    const letter = event.target.closest('.intro-letter');
    if (!letter || !intro.contains(letter)) return;
    if (mode === 'multiply') duplicate(letter);
    if (mode === 'flip') letter.classList.toggle('is-flipped');
    if (mode === 'shapes') shape(letter);
  });

  intro.addEventListener('pointermove', (event) => {
    if (mode === 'multiply' && event.timeStamp - lastDuplicate > 75) {
      const letter = event.target.closest('.intro-letter');
      if (letter) duplicate(letter);
      lastDuplicate = event.timeStamp;
    }
  });

  intro.addEventListener('pointerdown', (event) => {
    const letter = event.target.closest('.intro-letter');
    if (!letter) return;
    if (!finePointer && mode === 'multiply') duplicate(letter);
    if (!finePointer && mode === 'flip') letter.classList.toggle('is-flipped');
    if (!finePointer && mode === 'shapes') shape(letter);
  });

}
