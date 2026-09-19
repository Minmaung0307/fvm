import fs from 'node:fs';
const files=['public/app.js','public/vault.js','public/guide.js'];
for(const file of files)if(!fs.existsSync(file))throw Error(`${file} မတွေ့ပါ။ ဒီ script ကို project root folder မှာ run ပါ။`);
function patch(file,replacements){
  let source=fs.readFileSync(file,'utf8');
  if(source.includes("'semiannual'")||source.includes('Semiannual = ၆ လတစ်ကြိမ်')){console.log(file+' — semiannual ပါပြီးသား');return;}
  const original=source;
  for(const [before,after,label]of replacements){if(!source.includes(before))throw Error(`${file} ထဲ ${label} code မတွေ့ပါ။ မူလဖိုင်ကို မပြင်ဘဲ ရပ်ထားပါတယ်။`);source=source.replace(before,after);}
  fs.writeFileSync(file+'.before-semiannual',original);
  fs.writeFileSync(file,source);
  console.log(file+' — updated; backup: '+file+'.before-semiannual');
}
patch('public/vault.js',[
  ["['monthly','quarterly','yearly'].includes(frequency)","['monthly','quarterly','semiannual','yearly'].includes(frequency)",'frequency validation'],
  ["frequency==='monthly'?1:frequency==='quarterly'?3:0","frequency==='monthly'?1:frequency==='quarterly'?3:frequency==='semiannual'?6:0",'month calculation']
]);
patch('public/app.js',[
  ["r.frequency==='yearly'?+r.amount/12:r.frequency==='quarterly'?+r.amount/3:0","r.frequency==='yearly'?+r.amount/12:r.frequency==='semiannual'?+r.amount/6:r.frequency==='quarterly'?+r.amount/3:0",'monthly estimate'],
  ["['none','monthly','quarterly','yearly','one-time']","['none','monthly','quarterly','semiannual','yearly','one-time']",'billing cycle options'],
  ["`<option>${o}</option>`","`<option value=\"${o}\">${o==='semiannual'?'6 months (Semiannual)':o}</option>`",'option label'],
  ["['monthly','quarterly','yearly'].includes(record.frequency)","['monthly','quarterly','semiannual','yearly'].includes(record.frequency)",'payment recurrence']
]);
patch('public/guide.js',[
  ['Monthly = လစဉ်၊ Quarterly = ၃ လတစ်ကြိမ်၊ Yearly = နှစ်စဉ်။','Monthly = လစဉ်၊ Quarterly = ၃ လတစ်ကြိမ်၊ Semiannual = ၆ လတစ်ကြိမ်၊ Yearly = နှစ်စဉ်။','guide text']
]);
console.log('ပြီးပါပြီ။ npm test (ရှိလျှင်) run ပြီး Firebase Hosting deploy လုပ်ပါ။');
