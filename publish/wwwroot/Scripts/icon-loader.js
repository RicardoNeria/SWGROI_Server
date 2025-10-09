// Simple icon loader: looks for spans with data-icon and injects an <svg><use href="#id"></use></svg>
(function(){
  function injectIcon(el, id){
    if(!id) return;
    // create svg element referencing the symbol
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('focusable','false');
    svg.setAttribute('width','16');
    svg.setAttribute('height','16');
    const use = document.createElementNS(svgNS, 'use');
    // href for <use> must use xlink:href or href depending on browser; use setAttributeNS
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#'+id);
    svg.appendChild(use);
    // clear existing and append
    el.textContent = '';
    el.appendChild(svg);
  }

  function processAll(root){
    (root || document).querySelectorAll('span.ui-button__icon[data-icon]').forEach(el=>{
      // avoid reinjecting if already has an <svg>
      if (el.firstElementChild && el.firstElementChild.tagName && el.firstElementChild.tagName.toLowerCase() === 'svg') return;
      injectIcon(el, el.getAttribute('data-icon'));
    });
  }

  function run(){
    // lazy fetch icons.svg into DOM so <use> can reference symbols
    fetch('/Imagenes/icons.svg').then(r=>r.text()).then(txt=>{
      const div = document.createElement('div');
      div.style.display='none';
      div.innerHTML = txt;
      document.body.insertBefore(div, document.body.firstChild);

      // Inicial: inyectar todos los íconos presentes
      processAll(document);

      // Observer para elementos agregados dinámicamente (e.g., tablas renderizadas por JS)
      const observer = new MutationObserver((mutations)=>{
        for (const m of mutations){
          if (m.type === 'childList'){
            m.addedNodes.forEach(node => {
              if (!(node instanceof Element)) return;
              if (node.matches && node.matches('span.ui-button__icon[data-icon]')) {
                processAll(node.parentNode || node);
              } else if (node.querySelector) {
                const span = node.querySelector('span.ui-button__icon[data-icon]');
                if (span) processAll(node);
              }
            });
          } else if (m.type === 'attributes' && m.target instanceof Element) {
            if (m.target.matches('span.ui-button__icon[data-icon]')) {
              processAll(m.target.parentNode || m.target);
            }
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-icon'] });
    }).catch(()=>{
      // fallback: do nothing
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
