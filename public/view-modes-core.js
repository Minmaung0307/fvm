export function stableColorIndex(value,count=10){
  let hash=2166136261;
  for(const char of String(value||'')){hash^=char.codePointAt(0);hash=Math.imul(hash,16777619);}
  return (hash>>>0)%count;
}
export function taxonomyParts(value){
  const parts=String(value||'').split('·').map(x=>x.trim()).filter(Boolean);
  if(parts.length>=3)return {category:parts[0],group:parts[1],status:parts.slice(2).join(' · ')};
  if(parts.length===2)return {category:'',group:parts[0],status:parts[1]};
  return {category:'',group:parts[0]||'Ungrouped',status:''};
}
