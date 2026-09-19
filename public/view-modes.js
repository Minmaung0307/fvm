import {stableColorIndex,taxonomyParts} from './view-modes-core.js';
const content=document.querySelector('#content');
const heading=document.querySelector('.collection-heading');
if(content&&heading){
  const valid=new Set(['normal','compact-grid','compact-list']);
  let mode='normal';
  try{const saved=localStorage.getItem('family-vault-view-mode-v2');if(valid.has(saved))mode=saved;}catch{}

  // Hide the older two-button addon if it was previously installed.
  const controls=document.createElement('div');
  controls.className='view-mode-controls';
  controls.setAttribute('role','group');
  controls.setAttribute('aria-label','ပြသပုံ ရွေးရန်');
  const definitions=[['normal','▤ Normal'],['compact-grid','▦ Grid'],['compact-list','☷ List']];
  const buttons=definitions.map(([value,label])=>{
    const button=document.createElement('button');
    button.type='button';button.dataset.mode=value;button.textContent=label;
    button.onclick=()=>setMode(value);
    controls.append(button);return button;
  });
  heading.append(controls);

  function setMode(value){
    if(!valid.has(value))return;
    mode=value;try{localStorage.setItem('family-vault-view-mode-v2',mode);}catch{}apply();
  }
  window.addEventListener('family-vault:set-view-mode',event=>setMode(event.detail));
  function selectedView(){return document.querySelector('nav button.selected')?.dataset.view||'';}
  function colorBadge(kind,value){
    const badge=document.createElement('span');
    badge.className=`taxonomy-badge ${kind}-color-${stableColorIndex(value)}`;
    badge.textContent=value;badge.title=`${kind==='category'?'Category':kind==='group'?'Group':'Status'}: ${value}`;
    return badge;
  }
  function decorateCard(card){
    if(card.dataset.viewDecorated)return;
    card.dataset.viewDecorated='true';
    const oldTag=card.querySelector(':scope > .tag');
    if(oldTag){
      const {category,group,status}=taxonomyParts(oldTag.textContent);
      const badges=document.createElement('div');badges.className='taxonomy-badges';
      if(category)badges.append(colorBadge('category',category));
      if(group)badges.append(colorBadge('group',group));
      if(status)badges.append(colorBadge('status',status));
      oldTag.replaceWith(badges);
    }
    const glance=document.createElement('p');glance.className='compact-glance';
    const directParagraphs=[...card.children].filter(node=>node.tagName==='P'&&!node.classList.contains('compact-glance'));
    glance.textContent=directParagraphs.map(p=>p.textContent.trim()).filter(Boolean).slice(0,2).join(' · ')||'အသေးစိတ်ကြည့်ရန် နှိပ်ပါ';
    const title=card.querySelector(':scope > h3');
    if(title)title.insertAdjacentElement('afterend',glance);else card.prepend(glance);
    card.setAttribute('aria-label',(title?.textContent||'Record')+' အသေးစိတ်ကြည့်ရန်');
  }
  function toggle(card){
    if(mode==='normal')return;
    const opening=!card.classList.contains('is-expanded');
    content.querySelectorAll('.card.is-expanded').forEach(item=>{item.classList.remove('is-expanded');item.setAttribute('aria-expanded','false');});
    if(opening){card.classList.add('is-expanded');card.setAttribute('aria-expanded','true');card.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});}
  }
  content.addEventListener('click',event=>{
    if(event.target.closest('button,a,input,select,textarea,summary,label'))return;
    const card=event.target.closest('.card');if(card&&content.contains(card))toggle(card);
  });
  content.addEventListener('keydown',event=>{
    if(!['Enter',' '].includes(event.key)||event.target.closest('button,a,input,select,textarea,summary,label'))return;
    const card=event.target.closest('.card');if(card){event.preventDefault();toggle(card);}
  });
  function contextualEmptyState(){
    const view=selectedView(),cards=content.querySelector('.cards');
    if(view==='documents'&&cards&&!cards.children.length&&!content.querySelector('.documents-empty')){
      const empty=document.createElement('div');empty.className='empty-state documents-empty';empty.innerHTML='<span aria-hidden="true">▤</span><h3>Documents မရှိသေးပါ။</h3><p>အောက်က Document upload ခလုတ်ဖြင့် encrypted document အသစ်ထည့်နိုင်ပါသည်။</p>';
      cards.replaceWith(empty);
    }
    if(view==='history'&&content.querySelector('.empty-state button[data-action="emptyAdd"]')){
      const empty=document.createElement('div');empty.className='empty-state payments-empty';empty.innerHTML='<span aria-hidden="true">↗</span><h3>Payment history မရှိသေးပါ။</h3><p>Accounts & bills ထဲရှိ Bill ကိုဖွင့်ပြီး Record payment ကိုနှိပ်ပါ။ မိသားစုဝင်အသစ်ထည့်သည့်နေရာ မဟုတ်ပါ။</p>';
      content.replaceChildren(empty);
    }
  }
  function apply(){
    document.querySelectorAll('.vault-layout-controls').forEach(old=>old.hidden=true);
    content.classList.remove('vault-list-view','mode-normal','mode-compact-grid','mode-compact-list');
    content.classList.add('mode-'+mode);
    content.querySelectorAll('.card').forEach(card=>{decorateCard(card);if(mode==='normal'){card.removeAttribute('tabindex');card.removeAttribute('aria-expanded');}else{card.tabIndex=0;card.setAttribute('aria-expanded',String(card.classList.contains('is-expanded')));}});
    if(mode==='normal')content.querySelectorAll('.card.is-expanded').forEach(card=>{card.classList.remove('is-expanded');card.setAttribute('aria-expanded','false');});
    const visible=['records','documents'].includes(selectedView())&&!!content.querySelector('.card');
    controls.hidden=!visible;
    buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===mode)));
    contextualEmptyState();
    window.dispatchEvent(new CustomEvent('family-vault:view-mode',{detail:mode}));
  }
  new MutationObserver(apply).observe(content,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  document.querySelector('nav')?.addEventListener('click',()=>queueMicrotask(apply));
  apply();
}
