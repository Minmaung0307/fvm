import fs from 'node:fs';
const root=process.argv[2]||'.',path=name=>`${root.replace(/\/$/,'')}/public/${name}`;
const required=['app.js','vault.js','guide.js','index.html','sw.js'];for(const name of required)if(!fs.existsSync(path(name)))throw Error(`${path(name)} မတွေ့ပါ။ Project root မှာ run ပါ။`);
if(fs.readFileSync(path('app.js'),'utf8').includes("'four-month'")){console.log('Every 4 months + dashboard update ပါပြီးသားဖြစ်ပါတယ်။');process.exit(0);}
const updates=new Map();
function load(name){return fs.readFileSync(path(name),'utf8');}
function exact(source,before,after,label){if(!source.includes(before))throw Error(`${label} code မတွေ့ပါ။ ဘာဖိုင်မှမပြင်ဘဲ ရပ်ထားပါတယ်။`);return source.replace(before,after);}
let vault=load('vault.js');
vault=vault.replace(/if\(!date \|\| !\[[^\]]+\]\.includes\(frequency\)\) return date;/,"if(!date || !['monthly','quarterly','four-month','semiannual','yearly'].includes(frequency)) return date;");
if(!vault.includes("'four-month'"))throw Error('vault frequency validation မတွေ့ပါ။');
vault=vault.replace(/const target = new Date\(Date\.UTC\(y\+\(frequency==='yearly'\?1:0\),m-1\+\([^\n]+\),1\)\);/,"const target = new Date(Date.UTC(y+(frequency==='yearly'?1:0),m-1+(frequency==='monthly'?1:frequency==='quarterly'?3:frequency==='four-month'?4:frequency==='semiannual'?6:0),1));");
if(!vault.includes("frequency==='four-month'?4"))throw Error('vault month calculation မတွေ့ပါ။');
const oldEventFilter=".filter(([,date])=>date).map(([kind,date])=>({id:r.id,name:r.name,kind,date}))";
const newEventFilter=".filter(([kind,date])=>date&&!(kind==='due'&&r.paymentStatus==='paid')).map(([kind,date])=>({id:r.id,name:r.name,kind,date}))";
if(vault.includes(oldEventFilter))vault=vault.replace(oldEventFilter,newEventFilter);
if(!vault.includes("r.paymentStatus==='paid'"))throw Error('Paid bill alert filter မတွေ့ပါ။');updates.set('vault.js',vault);

let app=load('app.js');
app=app.replace(/\['frequency','Billing cycle','select',\[[^\]]+\]\]/,"['frequency','Billing cycle','select',['none','monthly','quarterly','four-month','semiannual','yearly','one-time']]");
if(!app.includes("'four-month','semiannual'"))throw Error('Billing cycle dropdown code မတွေ့ပါ။');
const originalOption="options.map(o=>`<option>${o}</option>`).join('')";
const semiOption="options.map(o=>`<option value=\"${o}\">${o==='semiannual'?'6 months (Semiannual)':o}</option>`).join('')";
const labeledOption="options.map(o=>`<option value=\"${o}\">${E(cycleLabels[o]||o)}</option>`).join('')";
if(!app.includes('const cycleLabels=')){
  if(app.includes(semiOption))app=app.replace(semiOption,labeledOption);else app=exact(app,originalOption,labeledOption,'Dropdown option');
  app=exact(app,'function fieldMarkup(',"const cycleLabels={none:'None',monthly:'Monthly',quarterly:'Quarterly / 3 mo','four-month':'Every 4 months',semiannual:'Semiannual / 6 mo',yearly:'Annual / yearly','one-time':'One time'};\nfunction fieldMarkup(",'Field markup');
}
app=app.replaceAll('E(r.frequency)','E(cycleLabels[r.frequency]||r.frequency)');
app=app.replace(/if\(\[[^\]]+\]\.includes\(record\.frequency\)&&record\.dueDate\)/,"if(['monthly','quarterly','four-month','semiannual','yearly'].includes(record.frequency)&&record.dueDate)");
if(!app.includes("'four-month','semiannual','yearly'].includes(record.frequency)"))throw Error('Payment recurrence code မတွေ့ပါ။');

if(!app.includes('function monthlyAverage(')){
  app=exact(app,'function render(){',`function monthlyAverage(record){
  if(record.recordType!=='bill')return 0;
  const amount=Number(record.amount)||0;
  return record.frequency==='monthly'?amount:record.frequency==='quarterly'?amount/3:record.frequency==='four-month'?amount/4:record.frequency==='semiannual'?amount/6:record.frequency==='yearly'?amount/12:0;
}
function addDays(date,days){const value=new Date(date+'T00:00:00Z');value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10);}
function render(){`,'Render function');
}
const statsStart=app.indexOf("$('#stats').innerHTML=");const recordsMarker='\nconst records=';const statsEnd=app.indexOf(recordsMarker,statsStart);
if(statsStart<0||statsEnd<0)throw Error('Dashboard stats code မတွေ့ပါ။');
const stats=`const next30=addDays(now,30),next90=addDays(now,90),next180=addDays(now,180);
const monthStart=now.slice(0,7)+'-01',monthEnd=new Date(Date.UTC(Number(now.slice(0,4)),Number(now.slice(5,7)),0)).toISOString().slice(0,10);
const realBills=active.filter(r=>r.recordType==='bill');
const dashboardStats=[
 ['Active records',active.length,'stat-active'],
 ['Due today',all.filter(e=>e.date===now).length,'stat-today'],
 ['Overdue alerts',all.filter(e=>e.date<now).length,'stat-overdue'],
 ['Next 30 days',all.filter(e=>e.date>now&&e.date<=next30).length,'stat-next30'],
 ['Next 90 days',all.filter(e=>e.date>now&&e.date<=next90).length,'stat-next90'],
 ['Next 180 days',all.filter(e=>e.date>now&&e.date<=next180).length,'stat-next180'],
 ['Bills due this month',money(realBills.filter(r=>r.dueDate>=monthStart&&r.dueDate<=monthEnd).reduce((sum,r)=>sum+(Number(r.amount)||0),0)),'stat-month-due'],
 ['Average / month',money(realBills.reduce((sum,r)=>sum+monthlyAverage(r),0)),'stat-average']
];
$('#stats').innerHTML=dashboardStats.map(([label,value,className])=>\`<div class="stat \${className}">\${E(label)}<strong>\${E(value)}</strong></div>\`).join('');`;
app=app.slice(0,statsStart)+stats+app.slice(statsEnd);
updates.set('app.js',app);

let guide=load('guide.js');
guide=guide.replace(/ frequency:'[^\n]*',/," frequency:'None = cycle မရှိ၊ Monthly = လစဉ်၊ Quarterly = ၃ လတစ်ကြိမ်၊ Every 4 months = ၄ လတစ်ကြိမ်၊ Semiannual = ၆ လတစ်ကြိမ်၊ Annual / yearly = နှစ်စဉ်၊ One time = တစ်ကြိမ်သာ။ Record payment လုပ်လျှင် recurring due date ကို cycle တစ်ခုရွှေ့သည်။',");
if(!guide.includes('Every 4 months = ၄ လတစ်ကြိမ်'))throw Error('Guide frequency text မတွေ့ပါ။');
if(!guide.includes('Dashboard ကိန်းဂဏန်းများ')){
  const end=guide.lastIndexOf('</div>`;');if(end<0)throw Error('Guide ending မတွေ့ပါ။');
  const block='<div class="guide-block"><h3>Dashboard ကိန်းဂဏန်းများ</h3><p><strong>Due today</strong> က ယနေ့ due/renewal/expiry ဖြစ်သော alerts၊ <strong>Overdue</strong> က ကျော်သွားသော alerts ဖြစ်သည်။ Next 30/90/180 days တွင် ယနေ့ပြီးနောက်လာမည့် alerts ကိုပြသည်။ <strong>Bills due this month</strong> က ဒီပြက္ခဒိန်လအတွင်း due ဖြစ်သော active bills အမှန်တကယ်ပမာဏကိုပေါင်းသည်။ <strong>Average / month</strong> က budget ခန့်မှန်းရန် Monthly အပြည့်၊ Quarterly ÷3၊ Every 4 months ÷4၊ Semiannual ÷6၊ Annual ÷12 တွက်သည်။ One-time ကို average ထဲမထည့်ပါ။</p></div>';
  guide=guide.slice(0,end)+block+guide.slice(end);
}
updates.set('guide.js',guide);

const dashboardCss=`/* Billing Dashboard v2.6 */
.stats{grid-template-columns:repeat(4,minmax(0,1fr))}
.stat.stat-active{background:linear-gradient(145deg,#fff,#efedff)}.stat.stat-today{background:linear-gradient(145deg,#fff,#fff6da)}.stat.stat-overdue{background:linear-gradient(145deg,#fff,#ffebe8)}.stat.stat-next30{background:linear-gradient(145deg,#fff,#eaf4ff)}.stat.stat-next90{background:linear-gradient(145deg,#fff,#e8f6f5)}.stat.stat-next180{background:linear-gradient(145deg,#fff,#f0ecff)}.stat.stat-month-due{background:linear-gradient(145deg,#fff,#fff0e7)}.stat.stat-average{background:linear-gradient(145deg,#fff,#eaf7ee)}
.stat.stat-today strong{color:#a97820}.stat.stat-overdue strong{color:#b95f55}.stat.stat-next30 strong,.stat.stat-next90 strong,.stat.stat-next180 strong{color:#4772a2}.stat.stat-month-due strong{color:#a96138}.stat.stat-average strong{color:#35775b}
@media(max-width:1050px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
let index=load('index.html');if(!index.includes('/billing-dashboard.css'))index=exact(index,'</head>','<link rel="stylesheet" href="/billing-dashboard.css"></head>','index head');updates.set('index.html',index);
let sw=load('sw.js');
const cachePattern=/const\s+(CACHE(?:_NAME)?)\s*=\s*(['"])[^'"]+\2\s*;/;
if(!cachePattern.test(sw))throw Error('service worker cache code မတွေ့ပါ။ ဘာဖိုင်မှမပြင်ဘဲ ရပ်ထားပါတယ်။');
sw=sw.replace(cachePattern,(_,name,quote)=>`const ${name} = ${quote}family-vault-personal-shell-billing-v2-6${quote};`);
if(!/["'](?:\.\/|\/)billing-dashboard\.css["']/.test(sw)){
  const shellPattern=/(const\s+(?:SHELL|STATIC_ASSETS)\s*=\s*\[)([\s\S]*?)(\]\s*;)/;
  const match=sw.match(shellPattern);
  if(!match)throw Error('service worker shell code မတွေ့ပါ။ ဘာဖိုင်မှမပြင်ဘဲ ရပ်ထားပါတယ်။');
  const firstAsset=match[2].match(/\n([ \t]*)(['"])((?:\.\/|\/)[^'"]+)\2\s*,?/);
  if(!firstAsset)throw Error('service worker asset list မတွေ့ပါ။ ဘာဖိုင်မှမပြင်ဘဲ ရပ်ထားပါတယ်။');
  const indent=firstAsset[1],quote=firstAsset[2],prefix=firstAsset[3].startsWith('./')?'./':'/';
  const addition=`\n${indent}${quote}${prefix}billing-dashboard.css${quote},`;
  sw=sw.replace(shellPattern,(_,start,body,end)=>start+addition+body+end);
}
updates.set('sw.js',sw);updates.set('billing-dashboard.css',dashboardCss);

// Write only after every expected code location has been validated.
for(const [name,source]of updates){const target=path(name);if(fs.existsSync(target))fs.writeFileSync(target+'.before-billing-v2.6',fs.readFileSync(target));fs.writeFileSync(target,source);console.log(name+' — updated');}
console.log('Every 4 months, clear option labels and dashboard v2.6 ပြီးပါပြီ။');
