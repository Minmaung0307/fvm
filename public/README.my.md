# Family Vault Interface v2.4 Update

ဒီ ZIP က v2.2 frontend အပေါ် သုံးရန်ဖြစ်ပြီး v2.3 Normal/Grid/List ကိုပါ အပြည့်ထည့်ထားပါတယ်။ `config.js`၊ Apps Script နဲ့ မူလ `public` folder ကို မဖျက်ပါနှင့်။

## အသစ်ပါဝင်တာများ

- Normal / Compact Grid / List သုံးမျိုး၊ Accounts & bills နှင့် Documents နှစ်ခုလုံး။
- Compact card/row ကို နှိပ် သို့ Enter/Space နှိပ်မှ card အပြည့်ဖြန့်ခြင်း။
- Category/Group အမည်အသစ်များကိုပါ တည်ငြိမ်သောအရောင် badge အလိုအလျောက်ပေးခြင်း။
- Payments empty page တွင် မှားနေသော `+ Account အသစ်` ဖယ်ပြီး Record payment လမ်းညွှန်မှန်ပြခြင်း။
- Settings ကို Summary၊ Display၊ Color legend၊ Groups/Categories၊ Alerts၊ Security/Storage အပိုင်းခွဲခြင်း။
- Group/Category များလာလျှင် Settings ထဲ အမည်ရိုက်ရှာနိုင်ခြင်း၊ အသုံးမရှိသေးသော 0-item အမည်ကို ဖျော့ပြခြင်း။
- Settings မှ Normal/Grid/List ရွေးနိုင်ခြင်း၊ Backup/Restore၊ Browser alerts ကို လွယ်ကူစွာသုံးနိုင်ခြင်း။
- `? အသုံးပြုနည်း` တွင် view modes၊ badge colors၊ payments၊ documents၊ backup/security လမ်းညွှန်အသစ်။

## ထည့်နည်း

၁။ ZIP ထဲက ဖိုင် ၅ ခုကို project ၏ `public` folder ထဲထည့်ပါ။ အမည်တူ v2.3 ဖိုင်ရှိလျှင် ဒီ version ဖြင့် အစားထိုးပါ။

- `view-modes.js`
- `view-modes-core.js`
- `view-modes.css`
- `settings-guide.js`
- `settings-guide.css`

၂။ ယခင် `view-switcher.js` / `view-switcher.css` ကို ချိတ်ထားသေးလျှင် `index.html` ထဲက ယင်း `<script>` / `<link>` နှစ်ကြောင်းကိုဖယ်ပါ။

၃။ `public/index.html` ထဲ `</head>` မတိုင်မီ ထည့်ပါ။ Soft Color Theme သုံးထားလျှင် အဲဒီ theme link ၏အောက်မှာထားပါ။

```html
<link rel="stylesheet" href="/view-modes.css">
<link rel="stylesheet" href="/settings-guide.css">
```

၄။ `</body>` မတိုင်မီရှိသော `app.js` စာကြောင်း၏အောက်မှာ ထည့်ပါ။

```html
<script type="module" src="/view-modes.js"></script>
<script type="module" src="/settings-guide.js"></script>
```

Script အစဉ်သည် app.js → view-modes.js → settings-guide.js ဖြစ်ရမည်။

၅။ `public/sw.js` ရဲ့ CACHE အမည်ကို အသစ်ပြောင်းပါ။

```js
const CACHE='family-vault-personal-shell-v2-4';
```

SHELL array ထဲ ဖိုင် ၅ ခုလုံး ထည့်ပါ။ ရှိပြီးသားစာရင်းကို မဖျက်ပါနှင့်။

```js
'/view-modes.js','/view-modes-core.js','/view-modes.css','/settings-guide.js','/settings-guide.css'
```

၆။ Deploy လုပ်ပါ။

```bash
npx firebase-tools deploy --only hosting
```

Browser/PWA ကို reload လုပ်ပါ။ Cache ဟောင်းဆက်မြင်ရလျှင် tabs/PWA အားလုံးပိတ်ပြီး ပြန်ဖွင့်ပါ။ Hard refresh လုပ်နိုင်ပါသည်။

## မပြောင်းသောအရာများ

ဒီ update သည် frontend display/help/settings ကိုသာပြင်သည်။ Google Sheets/Drive data format၊ encryption၊ Firebase config၊ Apps Script backend ကို မပြောင်းပါ။ ရှိပြီးသား records/documents မဖျက်ပါ။ Layout ရွေးချယ်မှုကိုသာ browser localStorage တွင်မှတ်ပြီး passwords၊ tokens သို့မဟုတ် Vault data မသိမ်းပါ။
