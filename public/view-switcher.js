// No account data is persisted; only the visual layout preference is stored.
const content = document.querySelector('#content');
const heading = document.querySelector('.collection-heading');
if (content && heading) {
  let layout = 'grid';
  try { layout = localStorage.getItem('family-vault-layout') === 'list' ? 'list' : 'grid'; } catch {}
  const controls = document.createElement('div');
  controls.className = 'vault-layout-controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'မှတ်တမ်းပြသပုံ');
  const buttons = ['grid', 'list'].map(mode => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = mode === 'grid' ? '▦ Grid' : '☷ List';
    button.dataset.layout = mode;
    button.addEventListener('click', () => {
      layout = mode;
      try { localStorage.setItem('family-vault-layout', mode); } catch {}
      applyLayout();
    });
    controls.append(button);
    return button;
  });
  heading.append(controls);
  function applyLayout() {
    const cards = content.querySelector('.cards');
    controls.hidden = !cards || content.hidden;
    content.classList.toggle('vault-list-view', layout === 'list');
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.layout === layout));
  }
  new MutationObserver(applyLayout).observe(content, {childList:true, attributes:true, attributeFilter:['hidden']});
  applyLayout();
}
