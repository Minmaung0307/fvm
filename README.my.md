# Billing Cycles + Dashboard v2.6

ဒီ update က မူလ v2.2 သို့မဟုတ် Semiannual v2.5 ထည့်ပြီးသား project နှစ်မျိုးလုံးပေါ်တွင် run နိုင်သည်။ `config.js`၊ Apps Script၊ encryption နဲ့ Google Sheets data ကို မပြောင်းပါ။

## Billing cycle options

- **None** — Payment cycle မသတ်မှတ်
- **Monthly** — လစဉ်
- **Quarterly / 3 mo** — ၃ လတစ်ကြိမ်
- **Every 4 months** — ၄ လတစ်ကြိမ်
- **Semiannual / 6 mo** — ၆ လတစ်ကြိမ်
- **Annual / yearly** — နှစ်စဉ်
- **One time** — တစ်ကြိမ်သာ

Record payment လုပ်လျှင် Monthly/Quarterly/4-month/Semiannual/Annual due date ကို သက်ဆိုင်ရာလအရေအတွက်ရွှေ့သည်။ Target လတွင် မူလရက်မရှိလျှင် လကုန်ရက်သို့ ချိန်သည်။ Paid ဖြစ်ပြီးသား one-time bill ကို stale due/overdue alert အဖြစ် မပြတော့ပါ။

## Dashboard အသစ်

- **Active records** — အသုံးပြုနေဆဲ real records။ နမူနာမပါ။
- **Due today** — ယနေ့ due၊ renewal၊ account/document expiry alerts။
- **Overdue alerts** — ယနေ့မတိုင်မီကျော်သွားသော alerts။
- **Next 30 / 90 / 180 days** — ယနေ့နောက်ပိုင်း သက်ဆိုင်ရာကာလအတွင်းလာမည့် alerts။ 90 days ထဲ 30 days ပါပြီး 180 days ထဲ 90 days ပါသော cumulative counts ဖြစ်သည်။
- **Bills due this month** — လက်ရှိပြက္ခဒိန်လအတွင်း due date ရှိသော active bills ၏ တကယ်ပေးရမည့် amount စုစုပေါင်း။
- **Average / month** — Budget ခွဲထားရန် normalized average။ Monthly အပြည့်၊ Quarterly ÷3၊ Every 4 months ÷4၊ Semiannual ÷6၊ Annual ÷12။ One-time မပါ။

`Next 4 months` သီးသန့် card မထည့်ထားပါ။ ၄ လ cycle ဆိုသည်မှာ bill တစ်ခု၏ payment interval ဖြစ်ပြီး dashboard viewing window မဟုတ်ပါ။ လာမည့်အရာကို Next 90/180 days တွင် မြင်ရပြီး အတိအကျနေ့ရက်ကို Calendar တွင်ကြည့်နိုင်သည်။

## ထည့်နည်း

၁။ ZIP ထဲက `add-billing-dashboard.mjs` ကို မိမိ project root folder ထဲထည့်ပါ။ `public` folder နဲ့ တစ်ဆင့်တည်းထားပါ။
၂။ Terminal မှာ project root သို့ဝင်ပြီး run ပါ။

```bash
node add-billing-dashboard.mjs
```

Script က ပြင်မည့် code နေရာအားလုံးကို အရင်စစ်ပြီးမှ ရေးသည်။ မူလဖိုင်များကို အောက်ပါ backup နာမည်များဖြင့် ထားပေးသည်။

```text
public/app.js.before-billing-v2.6
public/vault.js.before-billing-v2.6
public/guide.js.before-billing-v2.6
public/index.html.before-billing-v2.6
public/sw.js.before-billing-v2.6
```

`public/billing-dashboard.css` ကို အသစ်ဖန်တီးပြီး `index.html` နဲ့ service-worker cache ကို အလိုအလျောက်ချိတ်ပေးသည်။ Soft Color Theme နဲ့ interface v2.4 ကို ဆက်ထားနိုင်သည်။

၃။ Project tests ရှိလျှင် run ပါ။

```bash
npm test
```

၄။ Deploy လုပ်ပါ။

```bash
npx firebase-tools deploy --only hosting
```

၅။ Browser/PWA tabs အားလုံးပိတ်ပြီး ပြန်ဖွင့်ပါ။ Bill ကို Edit လုပ်၍ option အသစ်များပေါ်ကြောင်းစစ်ပါ။ စမ်းသပ် bill တွေဖြင့် 3/4/6-month Record payment due-date ရွှေ့မှု၊ Dashboard amounts နဲ့ Calendar ကိုစစ်ပါ။

ရှိပြီးသား Bill တစ်ခု၏ cycle ကို ပြောင်းချင်လျှင် Bill → Edit → Billing cycle အသစ်ရွေး → Save encrypted လုပ်ပါ။ Existing amount ကို cycle တစ်ခါပေးရသော စုစုပေါင်း amount အဖြစ်သတ်မှတ်ထားကြောင်း စစ်ပါ။
