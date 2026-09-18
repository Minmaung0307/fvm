# Family Vault v2.2 — ပိုလွယ်ကူသော Groups / Categories / Payments

လက်ရှိ Google login၊ ကိုယ်ပိုင် Drive/Sheet၊ encrypted records/docs နှင့် backend ကိုဆက်သုံးသည်။ Apps Script configuration ပြန်လုပ်စရာမလိုပါ။

## အသစ်ပါဝင်သည့်အရာများ

- Settings မှ Group/Category အသစ်တိုး၊ Rename၊ Remove လုပ်နိုင်သည်။ ဆက်စပ် item အရေအတွက်ပြသည်။
- Record form ထဲ Group/Category field အောက်က ＋ ခလုတ်မှ ချက်ချင်းအသစ်တိုးနိုင်သည်။ Form ထဲရေးထားသောအချက်အလက်ကိုမရှင်းပါ။ Document form တွင်လည်း Group အသစ်တိုးနိုင်သည်။
- Group rename လုပ်လျှင် records/documents ကိုအတူပြောင်းသည်။ Remove လုပ်လျှင် records/docs မဖျက်ဘဲ Ungrouped သို့ရွှေ့သည်။
- Category rename လုပ်လျှင် records ကိုအတူပြောင်းသည်။ Remove လုပ်လျှင် Other သို့ရွှေ့သည်။ Other ကို fallback အဖြစ်မဖျက်နိုင်ပါ။
- Account/Bill card ပေါ်တွင် Delete ခလုတ်တိုက်ရိုက်ပြထားသည်။ Delete လုပ်လျှင် ဆက်စပ် payment history ပါဖျက်သည်။ Confirmation မအတည်ပြုမီမဖျက်ပါ။
- Duplicate ခလုတ်က record အချက်အလက်ကို new form သို့ကူးပေးသည်။ Save လုပ်မှ record အသစ်ဖြစ်သည်။ Payment history ကိုမကူးပါ။ ကူးပြီး provider/password/dates ကိုလိုသလိုပြင်ပါ။
- Sort: အမည်၊ Due date၊ နောက်ဆုံးပြင်ထားမှုအလိုက်။ အရင် version records တွင် updatedAt မရှိသေးလျှင် Save ပြန်လုပ်ပြီးမှ recent sort တွင်ပါမည်။
- Payment မှတ်တမ်းကို ရက်စွဲ၊ paid amount၊ memo ဖြည့်သော dialog ဖြင့်သိမ်းနိုင်သည်။ ငွေလွှဲပေးခြင်းမဟုတ်ပါ။ Monthly/quarterly/yearly due date ကို cycle တစ်ခုရွှေ့သည်။
- နမူနာ records သည် actual payment မလုပ်မီ Edit/Save ဖြင့် real bill အဖြစ်ပြောင်းရမည်။

## Update လုပ်ရန် — config မပျောက်အောင်

1. လက်ရှိ app မှ encrypted backup အရင်ယူပါ။ မိမိ `public/config.js` ကိုလည်းသီးခြား copy သိမ်းပါ။
2. `family-vault-v2.2-update.zip` ဖြည်ပါ။ ZIP မှာ **ပြောင်းထားသော frontend ဖိုင်များသာ** ပါပြီး `config.js` မပါပါ။
3. ZIP ရဲ့ `public/` အတွင်းကဖိုင်တစ်ခုချင်းကို **ရှိပြီးသား public/ ထဲသို့ copy/overwrite** လုပ်ပါ။ Folder အလုံးလိုက် Replace မလုပ်ပါနှင့်။ ရှိပြီးသား public/ မဖျက်ပါနှင့်။
4. `config.js`, icons, manifest, Firebase project settings နှင့် Apps Script ကိုဆက်ထားပါ။ Root firebase.json ပြင်စရာမလိုပါ။
5. Project root Terminal တွင် run ပါ။

```sh
npx firebase-tools deploy --only hosting
```

6. App tabs အားလုံးပိတ်ပြီးပြန်ဖွင့်ပါ။ Google login/unlock ပြန်လုပ်ပါ။ အဟောင်း UI ကျန်လျှင် Cmd + Shift + R ဖြင့် hard reload လုပ်ပါ။

## အသုံးပြုနည်း

### Group အသစ်ကို Record ထည့်နေတုန်းတိုးရန်

Account / Bill အသစ် → Group field အောက်က ＋ Group အသစ် → အမည်ရေး → Save။ Group အသစ်ကို form မှာရွေးပေးမည်။ ကျန် record fields ဆက်ဖြည့်ပြီး Save encrypted လုပ်ပါ။

### Category အသစ်

Record form ရဲ့ ＋ Category အသစ် မှ Banking, Education, Travel ကဲ့သို့တိုးနိုင်သည်။ Settings → Categories မှလည်းတိုးနိုင်သည်။ Category သည် record အမျိုးအစားဖြစ်ပြီး Group သည်မိမိအုပ်စုခွဲခြားရာဖြစ်သည်။ ဥပမာ Group “သားသမီး”၊ Category “Education”။

### Rename / Remove

Settings → သက်ဆိုင်ရာ Group/Category ဘေး Rename ကိုနှိပ်ပါ။ အမည်အသစ်ရေးပြီး Save လုပ်ပါ။ Remove လုပ်လျှင် records/docs မဖျက်ပါ။ Record တစ်ခုအပြီးဖျက်လိုမှ card ရဲ့ Delete ကိုသုံးပါ။

### Duplicate

တူညီသော account/bill အသစ်လိုလျှင် Duplicate → အမည်နှင့်အချက်အလက်ပြင် → Save encrypted။ Cancel လုပ်လျှင် record အသစ်မဖြစ်ပါ။

### Payment

တကယ့် Bill card → Record payment → paid date, amount, memo → Save payment။ Bank/provider မှအမှန်တကယ်ပေးပြီးမှ ဒီနေရာမှာမှတ်ပါ။

## Verification

Automated tests ၁၈ ခုအောင်မြင်ထားသည်။ Group rename linkage၊ category removal/rename၊ duplicate-name validation၊ sort order၊ encryption/auth/ownership/revision နှင့်နမူနာ filtering တို့စစ်ထားသည်။ Live cloud နှင့် device visual verification မလုပ်ရသေးပါ။ Frontend version အသစ်ကို deploy ပြီး record အသေးတစ်ခုဖြင့်စမ်းပါ။
