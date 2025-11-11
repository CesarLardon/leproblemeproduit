document.addEventListener('DOMContentLoaded', () => {

  /* ---------------------------
     util: escapeHtml
  --------------------------- */
  function escapeHtml(s){
    return String(s || '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  /* ---------------------------
     DIAPORAMA (page d'accueil) -- inchangé
  --------------------------- */
  (function initSlideshow(){
    const container = document.querySelector('.slideshow');
    if (!container) return;
    const slides = Array.from(container.querySelectorAll('img'));
    if (slides.length === 0) return;
    slides.forEach(s => s.classList.remove('active'));
    slides[0].classList.add('active');
    let current = 0;
    setInterval(() => {
      slides[current].classList.remove('active');
      current = (current + 1) % slides.length;
      slides[current].classList.add('active');
    }, 3500);
  })();


  /* ---------------------------
     BIBLIOGRAPHIE -- unchanged DOM-based parser
  --------------------------- */
  (function initBibliographie(){
    const container = document.getElementById('bibliographie-text');
    const fallback = document.getElementById('fallback');
    const fileInput = document.getElementById('file-input');
    if (!container) return;

    function fetchAndRender() {
      fetch('bibliographie/bibliographie.txt')
        .then(r => {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.text();
        })
        .then(txt => {
          renderBibliographieFromText(txt);
          if (fallback) fallback.hidden = true;
        })
        .catch(err => {
          console.warn('Fetch bibliographie failed:', err);
          container.textContent = 'Le chargement automatique a échoué. Utilise le sélecteur ci-dessous.';
          if (fallback) fallback.hidden = false;
        });
    }

    function renderBibliographieFromText(raw) {
      const text = String(raw).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const tokenRegex = /(\[(.*?)\]|\{(.*?)\}|[^\[\{]+)/gs;
      container.innerHTML = '';
      let m;
      while ((m = tokenRegex.exec(text)) !== null) {
        if (m[2] !== undefined) {
          const title = m[2].trim();
          if (title.length) {
            const d = document.createElement('div');
            d.className = 'demibold';
            d.textContent = title;
            container.appendChild(d);
          }
        } else if (m[3] !== undefined) {
          const content = m[3];
          const span = document.createElement('span');
          span.className = 'obl';
          span.textContent = content;
          container.appendChild(span);
        } else {
          const chunk = m[0];
          if (chunk.length) {
            const textNode = document.createTextNode(chunk);
            container.appendChild(textNode);
          }
        }
      }
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          renderBibliographieFromText(reader.result);
          if (fallback) fallback.hidden = true;
        };
        reader.onerror = () => {
          container.textContent = 'Impossible de lire le fichier sélectionné.';
        };
        reader.readAsText(f, 'UTF-8');
      });
    }

    fetchAndRender();
  })();


  /* ---------------------------
     À PROPOS -- unchanged behaviour (but titles slightly bigger via CSS)
  --------------------------- */
  (function initAPropos(){
    const container = document.getElementById('apropos-text');
    const fallback = document.getElementById('apropos-fallback');
    const fileInput = document.getElementById('apropos-file-input');
    if (!container) return;

    const files = [
      { name: 'Titre1.txt', className: 'apropos-title' },
      { name: 'Texte1.txt', className: 'apropos-block' },
      { name: 'Titre2.txt', className: 'apropos-title' },
      { name: 'Texte2.txt', className: 'apropos-block' },
    ];

    function renderSections(sections) {
      container.innerHTML = '';
      sections.forEach(s => {
        const el = document.createElement('div');
        el.className = s.className;
        el.textContent = s.text;
        container.appendChild(el);
      });
    }

    function fetchAll() {
      Promise.all(files.map(f =>
        fetch(encodeURI('à propos/' + f.name))
          .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
          .then(txt => ({ text: txt, className: f.className }))
      ))
      .then(renderSections)
      .then(() => { if (fallback) fallback.hidden = true; })
      .catch(err => {
        console.warn('A propos fetch failed:', err);
        container.textContent = 'Le chargement automatique a échoué. Utilise le sélecteur ci-dessous.';
        if (fallback) fallback.hidden = false;
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', ev => {
        const chosen = Array.from(ev.target.files || []);
        if (chosen.length === 0) return;
        const readPromises = chosen.map(file => new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = () => {
            const def = files.find(f => f.name === file.name);
            const cls = def ? def.className : 'apropos-block';
            resolve({ text: reader.result, className: cls });
          };
          reader.readAsText(file, 'UTF-8');
        }));
        Promise.all(readPromises).then(renderSections);
      });
    }

    fetchAll();
  })();


  /* ---------------------------
     PODCAST MENU (10 titres)
     - lit podcast/titres/titre1.txt ... titre10.txt
     - affiche liens vers episode.html?id=N
     - preserve original newlines in titles
  --------------------------- */
  (function initPodcastMenu(){
    const list = document.getElementById('podcast-list');
    const fallback = document.getElementById('podcast-fallback');
    const fileInput = document.getElementById('podcast-file-input');
    if (!list) return;

    const count = 10;
    const basePath = 'podcast/titres/';

    // try to fetch each titreN.txt
    const promises = [];
    for (let i = 1; i <= count; i++) {
      const path = `${basePath}titre${i}.txt`;
      promises.push(
        fetch(path)
          .then(r => r.ok ? r.text() : Promise.reject(path))
          .catch(() => null)
      );
    }

    Promise.all(promises).then(results => {
      list.innerHTML = '';
      results.forEach((txt, idx) => {
        const i = idx + 1;
        const title = txt ? txt : `Épisode ${i}`;
        const a = document.createElement('a');
        a.href = `episode.html?id=${i}`;
        a.className = 'podcast-item';
        // preserve line breaks: escape then replace \n -> <br>
        a.innerHTML = escapeHtml(title).replace(/\n/g, '<br>');
        list.appendChild(a);
      });
      if (fallback) fallback.hidden = true;
    }).catch(err => {
      console.warn('Podcast titles load error', err);
      list.textContent = 'Impossible de charger automatiquement les titres.';
      if (fallback) fallback.hidden = false;
    });

    // fallback: allow user to supply multiple files (will display in chosen order)
    if (fileInput) {
      fileInput.addEventListener('change', ev => {
        const files = Array.from(ev.target.files || []);
        list.innerHTML = '';
        files.forEach((f, idx) => {
          const reader = new FileReader();
          reader.onload = () => {
            const a = document.createElement('a');
            a.className = 'podcast-item';
            a.href = `episode.html?id=${idx + 1}`;
            a.innerHTML = escapeHtml(reader.result).replace(/\n/g,'<br>');
            list.appendChild(a);
          };
          reader.readAsText(f, 'UTF-8');
        });
      });
    }
  })();


  /* ---------------------------
     EPISODE PAGE (dynamic)
     - title preserves newlines
     - portions <...> displayed smaller
     - descriptive text loaded (descriptif.txt) -> HalenoirCompact-Regular, pre-wrap, left-justified
     - image set to bottom-left region (handled by CSS)
     - player shows elapsed and duration
  --------------------------- */
  (function initEpisodePage(){
    const wrap = document.querySelector('.episode-content');
    if (!wrap) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || '1';
    const base = `podcast/${id}/`;

    const titleEl = document.getElementById('episode-title');
    const imgEl = document.getElementById('episode-image');
    const audioEl = document.getElementById('episode-audio');
    const fallback = document.getElementById('episode-fallback');
    const descrEl = document.getElementById('episode-descriptif');

    function tryFetchText(path) {
      return fetch(path).then(r => r.ok ? r.text() : Promise.reject()).catch(() => null);
    }

    // parse title: preserve newlines; render <...> parts in .title-small
    function renderTitleWithSmallTags(raw){
      titleEl.innerHTML = '';
      if (!raw) { titleEl.textContent = `Épisode ${id}`; return; }
      // keep original newlines and <> tags — we will treat <...> specially.
      // but to avoid HTML injection, escape everything first, then re-insert <...> parts
      const escaped = escapeHtml(raw).replace(/\r\n/g,'\n').replace(/\r/g,'\n');
      // find tokens: either <...> or other text
      const regex = /(&lt;(.+?)&gt;|[^\n<]+)/gs;
      // But easier: iterate characterwise for < > detection using original raw
      // We'll use a small parser that works on the original (unescaped) raw but create text nodes via textContent to avoid injection
      const original = String(raw).replace(/\r\n/g,'\n').replace(/\r/g,'\n');
      const tokenRe = /(<([^>]+)>|[^\<]+)/gs;
      let m;
      while ((m = tokenRe.exec(original)) !== null) {
        if (m[2] !== undefined) {
          // inside <>
          const span = document.createElement('span');
          span.className = 'title-small';
          span.textContent = m[2];
          titleEl.appendChild(span);
        } else {
          // plain chunk (may include newlines)
          const chunk = m[0];
          // preserve newlines: split by \n and append text nodes + <br>
          const parts = chunk.split('\n');
          parts.forEach((p, idx) => {
            titleEl.appendChild(document.createTextNode(p));
            if (idx < parts.length - 1) titleEl.appendChild(document.createElement('br'));
          });
        }
      }
    }

    // load title
    tryFetchText(`${base}titre.txt`).then(t => {
      renderTitleWithSmallTags(t ? t.trim() : null);
    });

    // load image: try image.jpg|png|webp
    (function findImageAndSet(){
      const candidates = [`${base}image.jpg`,`${base}image.png`,`${base}image.webp`];
      let idx = 0;
      function tryNext(){
        if (idx >= candidates.length) {
          imgEl.style.display = 'none';
          return;
        }
        const src = candidates[idx++];
        const img = new Image();
        img.onload = () => { imgEl.src = src; imgEl.style.display = 'block'; };
        img.onerror = () => { tryNext(); };
        img.src = src;
      }
      tryNext();
    })();

    // descriptif above player (left-justified, preserves newlines)
    tryFetchText(`${base}descriptif.txt`).then(txt => {
      if (txt != null) {
        descrEl.textContent = txt;
      } else {
        descrEl.textContent = '';
      }
    });

    // audio: set source and manage time display
    // try HEAD first (may fail on file://), fallback to setting src
    fetch(`${base}son.mp3`, { method: 'HEAD' })
      .then(r => {
        if (r.ok) audioEl.src = `${base}son.mp3`;
        else audioEl.src = `${base}son.mp3`; // still set, let player handle
      })
      .catch(() => {
        audioEl.src = `${base}son.mp3`;
      });

    // update time displays
    function formatTime(s){
      if (!isFinite(s) || isNaN(s)) return '0:00';
      s = Math.floor(s);
      const m = Math.floor(s/60);
      const sec = s%60;
      return `${m}:${sec.toString().padStart(2,'0')}`;
    }
  })();


  /* ---------------------------
     GLOSSAIRE MENU (50 titres)
     - reads glossaire/titres/1.txt ... 50.txt
     - clickable -> notion.html?id=N
     - builds alphabet nav and smooth-scrolls into list on letter click
  --------------------------- */
  (function initGlossaireMenu(){
    const list = document.getElementById('glossaire-list');
    const fallback = document.getElementById('glossaire-fallback');
    const alphabetContainer = document.getElementById('alphabet-nav');
    if (!list) return;

    const total = 50;
    const base = 'glossaire/titres/';
    const promises = [];
    for (let i = 1; i <= total; i++) {
      const path = `${base}${i}.txt`;
      promises.push(fetch(path).then(r => r.ok ? r.text() : Promise.reject(path)).catch(() => null));
    }

    Promise.all(promises).then(results => {
      list.innerHTML = '';
      results.forEach((txt, idx) => {
        const i = idx + 1;
        const title = txt ? txt.trim() : `Notion ${i}`;
        const a = document.createElement('a');
        a.className = 'glossaire-entry';
        a.href = `notion.html?id=${i}`;
        a.textContent = title;
        a.id = `glossaire-entry-${i}`;
        list.appendChild(a);
      });
      if (fallback) fallback.hidden = true;

      // populate alphabet
      if (alphabetContainer) {
        alphabetContainer.innerHTML = '';
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        letters.forEach(letter => {
          const d = document.createElement('div');
          d.className = 'alpha-letter';
          d.textContent = letter;
          d.addEventListener('click', () => {
            // find first entry that starts with this letter (case-insensitive)
            const entries = Array.from(list.querySelectorAll('.glossaire-entry'));
            const lc = letter.toLowerCase();
            let found = null;
            for (const e of entries) {
              const txt = (e.textContent || '').trim().toLowerCase();
              if (txt.startsWith(lc)) { found = e; break; }
            }
            if (found) {
              // scroll within the .glossaire-list element
              const offset = found.offsetTop;
              list.scrollTo({ top: offset - 150, behavior: 'smooth' });
            }
          });
          alphabetContainer.appendChild(d);
        });
      }

    }).catch(err => {
      console.warn('Glossaire titles load error', err);
      list.textContent = 'Impossible de charger automatiquement les titres du glossaire.';
      if (fallback) fallback.hidden = false;
    });
  })();


  /* ---------------------------
     NOTION PAGE (dynamic)
     - loads glossaire/notions/{id}/titre.txt, texte.txt, legende.txt and image
     - layout: left (title + texte) / right (image + legend)
     - text and legends: parse { ... } -> inline span.obl (RegularObl)
     - text size ~20px; legend ~8px
  --------------------------- */
  (function initNotionPage(){
    const wrap = document.querySelector('.notion-content');
    if (!wrap) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || '1';
    const base = `glossaire/notions/${id}/`;

    const titleEl = document.getElementById('notion-title');
    const textEl = document.getElementById('notion-text');
    const imageEl = document.getElementById('notion-image');
    const legendEl = document.getElementById('notion-legend');

    function tryFetchText(path) {
      return fetch(path).then(r => r.ok ? r.text() : Promise.reject()).catch(() => null);
    }

    // helper to parse { ... } inline into nodes (span.obl) while preserving newlines
    function parseInlineOblIntoElement(raw, targetEl) {
      const text = String(raw || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const tokenRegex = /(\{(.*?)\}|[^\{]+)/gs;
      targetEl.innerHTML = '';
      let m;
      while ((m = tokenRegex.exec(text)) !== null) {
        if (m[2] !== undefined) {
          const span = document.createElement('span');
          span.className = 'obl';
          span.textContent = m[2];
          targetEl.appendChild(span);
        } else {
          const chunk = m[0];
          // preserve newlines
          const parts = chunk.split('\n');
          parts.forEach((p, idx) => {
            targetEl.appendChild(document.createTextNode(p));
            if (idx < parts.length - 1) targetEl.appendChild(document.createElement('br'));
          });
        }
      }
    }

    // title
    tryFetchText(`${base}titre.txt`).then(t => {
      titleEl.textContent = t ? t.trim() : `Notion ${id}`;
      imageEl.setAttribute('alt', (t ? t.trim() : `Notion ${id}`));
    });

    // texte (parse { } inline)
    tryFetchText(`${base}texte.txt`).then(txt => {
      if (txt != null) parseInlineOblIntoElement(txt, textEl);
    });

    // legend
    tryFetchText(`${base}legende.txt`).then(txt => {
      if (txt != null) parseInlineOblIntoElement(txt, legendEl);
    });
    
    // image: try jpg/png/webp
    (function findImage(){
      const candidates = [`${base}image.jpg`, `${base}image.png`, `${base}image.webp`];
      let idx = 0;
      function tryNext(){
        if (idx >= candidates.length) { imageEl.style.display = 'none'; return; }
        const src = candidates[idx++];
        const img = new Image();
        img.onload = () => { imageEl.src = src; imageEl.style.display = 'block'; };
        img.onerror = () => { tryNext(); };
        img.src = src;
      }
      tryNext();
    })();
  })();


}); // DOMContentLoaded
