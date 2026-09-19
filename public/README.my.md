# ၆ လတစ်ကြိမ် Billing Cycle ထည့်နည်း

`Quarterly` သည် ၃ လတစ်ကြိမ်ဖြစ်သည်။ ဒီ update က `6 months (Semiannual)` option ထည့်ပေးသည်။

- Bill amount မှာ ၆ လတစ်ကြိမ်တကယ်ပေးရသော စုစုပေါင်းပမာဏထည့်ပါ။
- Monthly estimate တွင် amount ÷ 6 ဖြင့်တွက်မည်။
- Record payment လုပ်လျှင် နောက် due date ကို ၆ လရွှေ့မည်။ လကုန်ရက်မရှိလျှင် ထိုလ၏နောက်ဆုံးရက်သို့ ချိန်မည်။
- ရှိပြီးသား bills/data ကို မပြောင်းပါ။ လိုသော bill ကို Edit လုပ်ပြီး cycle အသစ်ရွေးပါ။

## လက်ရှိပြင်ထားသော project မပျက်စေသည့်နည်း

၁။ ZIP ထဲက `add-semiannual.mjs` ကို မိမိ project root folder ထဲထည့်ပါ။ `public` folder နဲ့ တစ်ဆင့်တည်းဖြစ်ရမည်။
၂။ VS Code Terminal ကို project root မှာဖွင့်ပြီး run ပါ။

```bash
node add-semiannual.mjs
```

Script က လိုအပ်သောနေရာအားလုံးတွေ့မှသာ ဖိုင်ကိုပြင်သည်။ ဖိုင်တစ်ခုစီ၏ မူလ copy ကို အောက်ပါအမည်ဖြင့်ထားပေးသည်။

- `public/app.js.before-semiannual`
- `public/vault.js.before-semiannual`
- `public/guide.js.before-semiannual`

`semiannual ပါပြီးသား` ဟုပြလျှင် နောက်တစ်ကြိမ် ထပ်မပြင်ပါ။ Code မကိုက်လျှင် မူလဖိုင်ကို မပြင်ဘဲ error ပြပြီးရပ်သည်။

၃။ `public/sw.js` ထဲ CACHE အမည်ကို အသစ်ပြောင်းပါ။ ဥပမာ:

```js
const CACHE='family-vault-personal-shell-v2-5';
```

၄။ Project မှာ tests ရှိလျှင် run ပါ၊ ပြီးမှ deploy လုပ်ပါ။

```bash
npm test
npx firebase-tools deploy --only hosting
```

၅။ Browser/PWA tabs အားလုံးပိတ်ပြီး ပြန်ဖွင့်ပါ။ Bill ကို Edit → Billing cycle တွင် `6 months (Semiannual)` ပေါ်ကြောင်းစစ်ပါ။ စမ်းသပ် bill တစ်ခုဖြင့် Record payment လုပ်ပြီး due date ၆ လရွှေ့ကြောင်း စစ်ပါ။

## ပြန်ဖျက်ချင်လျှင်

Deploy မလုပ်မီ `.before-semiannual` backup ဖိုင်သုံးခုကို မူလအမည်သို့ပြန်ထားနိုင်သည်။ Deploy ပြီးသားဖြစ်လျှင် backup ပြန်ထား၊ CACHE အမည်ထပ်ပြောင်းပြီး hosting deploy ပြန်လုပ်ပါ။

ဒီ update က frontend files သုံးခုကိုသာပြင်သည်။ `config.js`၊ Apps Script၊ Google Sheets data နဲ့ encryption format ကို မပြောင်းပါ။
