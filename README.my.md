# Family Vault v2 — ကိုယ်ပိုင် Gmail / Drive / Docs

ဒီ version သည် ပေးပို့ထားသော dashboard နှင့် Apps Script ကို private personal vault ပုံစံတိုးချဲ့ထားသော replacement project ဖြစ်သည်။ မိသားစုဝင်တိုင်း သူတို့ Gmail ဖြင့်ဝင်၍ သူတို့ Google Drive ထဲ သီးခြား Google Sheet နှင့် encrypted documents သိမ်းနိုင်သည်။ မူလ Sheet ကို အလိုအလျောက်မပြင်၊ မဖျက်ပါ။

## ပါဝင်သည့် features

| Feature | လုပ်ဆောင်ချက် |
|---|---|
| Gmail login | Firebase Google authentication + Google Drive authorization |
| Personal storage | Login ဝင်သူ Gmail ပိုင် private folder / Sheet ကို auto-create |
| Accounts & bills | Add/edit/delete/archive/closed; monthly/quarterly/yearly bills |
| Sensitive fields | Password, username, email, PIN, account number, memo, payment data ကို client-side encrypt |
| Documents | PDF, PNG/JPG/WebP, DOCX, XLSX, TXT/CSV upload; encrypted download |
| Organization | Groups, tags, favorites, global search, type/status filters |
| Reminders | Due/renewal/expiry/document expiry; calendar month grid + agenda |
| Payments | History, payment logging, due cycle advance, history deletion |
| Security tools | Strong password generator, passphrase change, idle/background lock |
| Recovery | Encrypted metadata backup/restore, legacy JSON import |
| PWA | Phone/iPad/desktop installation; shell-only offline cache |

Docs တစ်ဖိုင်လျှင် **3 MiB** limit ရှိသည်။ ဖိုင်ထဲကစာသားကို OCR/full-text search မလုပ်ပါ။ Name, tags, group, memo ကိုရှာသည်။ Document view တွင် record category/type filters မသုံးဘဲ group/status/favorites/search ကိုသုံးသည်။

## Storage / authorization ပုံစံ

```text
User Gmail
  → Firebase Google login: identity
  → Google drive.file permission: own Drive authorization
  → Apps Script: verify BOTH tokens + allowlist + Google account match
  → User's Drive folder
       ├─ Encrypted Google Sheet (records/payments/groups/document metadata)
       └─ UUID.fvdoc files (encrypted document bytes)
```

Google Drive/Sheets APIs ကို Script owner ၏ credential မသုံးဘဲ login ဝင်သူ၏ Google OAuth token ဖြင့် call သည်။ Drive scope သည် `drive.file` သာဖြစ်၍ app ဖန်တီး/ခွင့်ပြုထားသည့် files များသာသုံးသည်။ တစ်ယောက်၏ file ID ကို အခြားသူပို့လည်း `ownedByMe`, Firebase uid marker, file role, parent folder တို့စစ်သည်။ မိသားစု allowlist မပါသူကို backend ကငြင်းသည်။

Google OAuth access token နှင့် Firebase ID token ကို HTTPS POST body ထဲမှ backend သို့ပို့သည်။ Tokens/passphrase ကို Sheet, Script Properties, localStorage, URL query, application logs ထဲမသိမ်းပါ။ Google access token သက်တမ်းကုန်လျှင် Sign out → login ပြန်လုပ်ရမည်။ Firebase ID token refresh က Google access token ကို refresh မလုပ်ပေးပါ။ Refresh token ကို server တွင်သိမ်းခြင်း မပါပါ။

User တစ်ယောက်၏ Drive ကို အခြားမိသားစုဝင်အား အလိုအလျောက် share မလုပ်ပါ။ Owner Apps Script သည် သင့် active OAuth token ကို processing လုပ်သော trusted service ဖြစ်သည်။ Admin/hosting code ကိုယုံကြည်ရမည်။ Passphrase မရှိဘဲ encrypted payload ကို decrypt မလုပ်နိုင်သော်လည်း malicious frontend/compromised device က unlocked data ဖတ်နိုင်သည်။ Independent security audit မပြုလုပ်ရသေးပါ။

## ၁။ အဟောင်းကို အရင်သိမ်းပါ

1. မူလ Google Sheet ကို Make a copy လုပ်ပါ။
2. HTML/script အဟောင်းကို သီးခြား backup သိမ်းပါ။
3. ဒီ project ကို `family-vault-v2` folder အသစ်မှာ စမ်းပါ။ အဟောင်း folder ကို မဖျက်ပါနှင့်။
4. အဟောင်း Apps Script public deployment ကို အသုံးမပြုတော့လျှင် Manage deployments မှ archive လုပ်ပါ။ လက်ရှိကုဒ်၏ `getLogs`, `init` GET endpoints နှင့် client-supplied email authorization သည် secure login မဟုတ်ပါ။

ပေးပို့ထားသော HTML ၏ masterKey သည် encryption လုပ်ခြင်းမရှိပါ။ `pass`, `user`, `no` fields နှင့် backend `encryptedPassword`, `encryptedUsername`, `encryptedAccountNumber` schema မကိုက်ပါ။ Backend သို့ အချက်အလက်ရောက်ပြီးသားဟု မယူဆပါနှင့်။ HTML ထဲရှိ sample credentials သည် v2 ထဲ auto-import မလုပ်ပါ။

## ၂။ Firebase / Google Cloud ပြင်ဆင်ရန်

1. [Firebase Console](https://console.firebase.google.com/) တွင် အခုသုံးနေသော project ကိုဖွင့်ပါ။
2. Authentication → Sign-in method → **Google** ကို enable လုပ်ပါ။
3. Project settings → Your apps → Web app ကို register လုပ်ပါ။
4. Firebase Web config မှ `apiKey`, `authDomain`, `projectId`, `appId` ကို `public/config.js` ထဲထည့်ပါ။ API key သည် public Firebase identifier ဖြစ်သည်။ **Client secret ကို frontend ထဲ မထည့်ပါနှင့်။**
5. Firebase နှင့်တူသော [Google Cloud Console](https://console.cloud.google.com/) project ကိုရွေးပါ။ APIs & Services → Library မှ **Google Drive API** နှင့် **Google Sheets API** ကို enable လုပ်ပါ။
6. Google Auth Platform / OAuth consent screen တွင် app name, support email, developer email ပြင်ပါ။ Gmail accounts သုံးလျှင် Audience ကို External ရွေးပါ။
7. Testing mode သုံးလျှင် Test users ထဲ မိသားစုဝင် Gmail တစ်ယောက်ချင်း ထည့်ပါ။
8. Data Access scopes တွင် `https://www.googleapis.com/auth/drive.file` ကိုထည့်ပါ။ Basic profile/email/OpenID identity scopes သည် Google sign-in အတွက်ဖြစ်သည်။ Full `drive` သို့ full `spreadsheets` scope မလိုပါ။
9. Firebase ကဖန်တီးထားသော Web OAuth client ကို ထို project မှာ အသုံးပြုပါ။ `authDomain` ကို default `PROJECT.firebaseapp.com` အတိုင်းထားပါ။ OAuth redirect handler သည် `https://PROJECT.firebaseapp.com/__/auth/handler` ဖြစ်သည်။ Config/OAuth client မတူသော project မရောပါနှင့်။
10. Firebase Authentication → Settings → Authorized domains တွင် `localhost`, `PROJECT.web.app`, production custom domain တို့ထည့်ပါ။

OAuth consent Google Drive checkbox ပေါ်လာလျှင် permission ပေးရမည်။ Identity login သာခွင့်ပြုပြီး Drive permission မပေးလျှင် personal Sheet/docs မသိမ်းနိုင်ပါ။ Testing/production နှင့် app verification requirements သည် Google OAuth policy အပေါ်မူတည်သည်။ Public release မလုပ်မီ Console ပြသော verification requirements ကိုလိုက်နာပါ။

အကိုးအကား: [Firebase Google sign-in + OAuth access token](https://firebase.google.com/docs/auth/web/google-signin), [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [Sheets batchUpdate / scopes](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate), [OAuth readiness](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview)

## ၃။ Apps Script အသစ် Deploy လုပ်ရန်

1. [Apps Script](https://script.google.com/) မှ New project ဖန်တီးပါ။ မူလ Sheet-bound code အပေါ် overwrite မလုပ်သေးပါနှင့်။
2. `apps-script/Code.gs` ကိုကူးထည့်ပါ။ မူလ functions များနှင့်ရောမထည့်ပါနှင့်။
3. Project Settings မှ Show `appsscript.json` ဖွင့်၍ `apps-script/appsscript.json` ကိုကူးထည့်ပါ။ Timezone ကိုသင့်ဒေသအတိုင်းပြင်ပါ။
4. Script Properties တွင် အောက်ပါတန်ဖိုးနှစ်ခု ထည့်ပါ။

| Property | Value |
|---|---|
| `FIREBASE_API_KEY` | အထက် Firebase Web apiKey |
| `FAMILY_EMAILS` | တကယ့် allowed Gmail များ၊ comma ခြား: `you@gmail.com,partner@gmail.com` |

Empty allowlist သို့ `*` ကိုအလိုအလျောက်ခွင့်ပြုခြင်းမရှိပါ။ Sheet ID ထည့်စရာမလိုတော့ပါ။ User တစ်ယောက်ချင်း Sheet auto-create ဖြစ်မည်။

5. Deploy → New deployment → Web app; Execute as **Me**, access **Anyone** ရွေးပါ။ Backend သည် request တိုင်း Firebase token / Google token စစ်သဖြင့် public endpoint မှ raw vault data မဖတ်နိုင်ပါ။ Workspace က Anyone ကိုတားထားလျှင် organization policy ခွင့်ပြုချက်လိုသည်။
6. `/exec` URL ကို `public/config.js` ၏ `apiUrl` ထဲထည့်ပါ။ အဟောင်း insecure URL သို့ `/dev` မသုံးပါနှင့်။
7. Code ပြင်တိုင်း Manage deployments → Edit → New version → Deploy လုပ်ပါ။
8. Email reminders သုံးလိုလျှင် editor မှ `installReminderTrigger` တစ်ကြိမ် Run လုပ်၍ permissions ပေးပါ။ Mail sender သည် script owner ဖြစ်သည်။

Frontend သည် text/plain JSON POST နှင့် readable JSON response သုံးသည်။ `no-cors` / opaque response မသုံးပါ။ Save response အောင်မြင်မှ UI state ကိုအတည်ပြုသည်။

## ၄။ Local စမ်းပြီး Firebase Hosting တင်ရန်

ဒီ project root — `family-vault-v2` — ထဲ Terminal ဖွင့်ပါ။

```sh
npm test
npm run serve
```

`http://localhost:8080` ကိုဖွင့်၍ Gmail login → Drive permission → ကိုယ်ပိုင် passphrase သတ်မှတ်ပါ။ ပထမဆုံး passphrase ကိုနှစ်ခါရိုက်ရမည်။ Password manager ထဲလုံခြုံစွာမှတ်ထားပါ။ မိသားစု shared passphrase မလိုတော့ပါ။

သင့် Gmail ၏ Drive ထဲ `Family Vault — Private` folder နှင့် `Family Vault — Encrypted Database` Sheet ကိုတွေ့ရမည်။ မိသားစုဝင်တစ်ယောက်ချင်း login ဝင်စမ်း၍ သူ့ data သီးသန့်ဖြစ်ကြောင်းစစ်ပါ။

Deploy:

```sh
npm install
npx firebase login
npx firebase use --add
npx firebase deploy --only hosting
```

မူလ Firebase project ကိုရွေး၍ alias `default` ထည့်ပါ။ ရှိပြီးသား `firebase.json` ကိုသုံးပါ; public directory သည် `public` ဖြစ်သည်။ `index.html` အပါအဝင် frontend files အားလုံး `public/` ထဲမှာရှိရမည်။ Root ကို public directory လုပ်၍ Apps Script/tests/guide files ပါ hosting မတင်ပါနှင့်။

Deployment ပြီးလျှင် console ပြသော Hosting URL ကိုဖွင့်ပါ။ အရင် PWA က stale screen ပြလျှင် app tabs အားလုံးပိတ်ပြီးပြန်ဖွင့်ပါ။ လိုအပ်လျှင် browser site data/service worker ကို clear လုပ်ပါ။ Google login/session memory-only ဖြစ်၍ ပြန်ဝင်ရမည်။

အကိုးအကား: [Firebase Hosting setup](https://firebase.google.com/docs/hosting/quickstart)

## ၅။ Accounts, docs, groups အသုံးပြုရန်

- New record တွင် type `account` သို့ `bill` ရွေးပါ။ Category, group, tags, fields ဖြည့်ပြီး Save encrypted လုပ်ပါ။
- Password field ဘေး Generate strong password နှိပ်၍ random password ထုတ်နိုင်သည်။ Provider ၏ password rules နှင့်ကိုက်ညီအောင်စစ်ပါ။
- Provider history တွင် `2026-09-18 — Comcast → Verizon — Plan ပြောင်း` ကဲ့သို့ရေးပါ။ History သည် free-text ဖြစ်သည်။
- Record payment တွင် ရက်စွဲ, amount, memo ထည့်ပါ။ Cycle တစ်ခုသာရွှေ့သည်။ Jan 31 မှ Feb တွင် လကုန်ရက်သို့ချုံ့သည်။ Quarterly သည် ၃ လတိုးသည်။ Renewal/expiry သီးခြားဖြစ်၍ manual ပြင်ပါ။
- Documents → Document upload တွင် အမည်၊ group၊ tags၊ expiry၊ ဆက်စပ် account/bill ကိုရွေးပါ။ Original document binary နှင့် original filename ကို encrypt လုပ်သည်။ Drive တွင် UUID `.fvdoc` အမည်ဖြင့်သာရှိမည်။
- Documents Download သည် browser ထဲ decrypt လုပ်ပြီး မူလဖိုင်ကို device သို့သိမ်းသည်။ Drive native preview မလုပ်နိုင်ပါ။ Download လုပ်ပြီးသား plaintext copy သည် vault lock နှင့်မဖျက်နိုင်ပါ။
- Documents Edit သည် metadata ကိုပြင်သည်။ File အစားထိုးချင်လျှင် အသစ် upload လုပ်ပြီး အဟောင်းကို Trash လုပ်ပါ။
- Document Trash သည် metadata ဖယ်ပြီး encrypted Drive file ကို Trash သို့ရွှေ့သည်။ Drive Trash က restore လုပ်လျှင် file ပြန်ရသော်လည်း app metadata ကို backup မှ restore ပြန်လုပ်ရန်လိုသည်။
- Group ဖျက်လျှင် records/docs မဖျက်ဘဲ Ungrouped ထားသည်။
- Closed/archived records/docs များမှ alerts မထွက်ပါ။ Status filter ပြောင်း၍ပြန်ရှာနိုင်သည်။

## ၆။ Encryption, passphrase, backup

Records/payments/groups/document metadata အားလုံးကို browser Web Crypto AES-256-GCM ဖြင့် encrypt လုပ်သည်။ PBKDF2-SHA256 600,000 iterations ဖြင့် passphrase မှ key ထုတ်သည်။ Document bytes သည် သီးခြား random 256-bit key ဖြင့် encrypt လုပ်သည်။ Document key ကို vault passphrase key ဖြင့် encrypted wrap လုပ်ထားသည်။ Passphrase ပြောင်းလျှင် vault snapshot နှင့် document key wrapper ကိုအသစ်ပြုလုပ်၍ docs files တစ်ခုချင်းပြန် upload မလိုပါ။

Passphrase/key ကို server သို့မပို့ပါ။ Firebase password reset ဖြင့် vault key ပြန်မရပါ။ Google account တွင် 2-step verification ဖွင့်ထားပါ။ Idle ၅ မိနစ်သို့ background/tab ပြောင်းလျှင် lock ဖြစ်သည်။

**Encrypted backup** သည် records/payments/groups/document metadata + wrapped document key ပါသည်။ Document binaries သည် backup JSON ထဲမပါဘဲ Drive ထဲရှိနေသေးသည်။ Full disaster backup အတွက် encrypted Drive `.fvdoc` files များကိုလည်း သီးခြားကူးသိမ်းပါ။ Encrypted copy button ဖြင့်တစ်ဖိုင်ချင်း download လုပ်နိုင်သည်။ ထို file ကိုတစ်ခုတည်းယူပြီး passphrase တစ်ခုတည်းဖြင့်မဖွင့်နိုင်ပါ; wrapped document key ပါသော vault backup လိုသည်။ Standalone `.fvdoc` import UI မပါသေးပါ။

Docs ပါသော metadata backup restore ကို မူလ Firebase project/Google account မှာသာလုပ်နိုင်သည်။ Drive files ကိုဖျက်ပြီး file IDs အသစ်ဖြင့်ပြန်တင်လျှင် references ပြန်ချိတ်ရန်လိုသည်။ Current backup ယူပြီးမှ restore လုပ်ပါ။ Metadata restore သည် လက်ရှိ metadata ကိုအစားထိုးသော်လည်း အစားထိုးထွက်သွားသော document files ကိုအလိုအလျောက်ဖျက်မပစ်ပါ။

Passphrase ပြောင်းပြီးနောက် backup အသစ်ယူပါ။ အရင် backup တွေသည် အရင် passphrase လိုနေသေးသည်။ Vault ciphertext size က 1,000,000 base64 characters limit ရှိသည်။ Sheet cells 30,000-character chunks အဖြစ်သိမ်းသဖြင့် တစ် cell limit ကိုမကျော်ပါ။ Apps Script lock + revision check + atomic Sheets update ဖြင့် device နှစ်ခုစလုံး save လုပ်ရာ stale overwrite ကိုတားသည်။ Sheet ကိုလက်ဖြင့်ပြင်ခြင်း၊ script deployment သီးခြားများရေးခြင်းတို့မှ conflict ကိုတော့မတားနိုင်ပါ။

## ၇။ Email / browser reminders

Groups & settings တွင် daily email ကို opt-in လုပ်မှ reminder metadata ကို Script Properties ထဲသိမ်းမည်။ User ၏ Gmail သို့သာပို့သည်။ လွတ်လပ်သော targetEmail မပို့နိုင်ပါ။ Generic overdue/upcoming counts သာ email ထဲပါသည်။ Script owner က reminder trigger setup လုပ်ရမည်။

Opt-in လုပ်ထားစဉ် **ရက်စွဲ၊ alert kind၊ email** သည် reminder server တွင် plaintext metadata အဖြစ်ရှိသည်။ Sensitive names/passwords/account numbers/amounts/docs မသိမ်းပါ။ Opt-out save လုပ်လျှင် metadata ဖယ်သည်။ Apps Script/Mail quotas နှင့် Script Properties storage limit သက်ရောက်သည်။ ဒီ service သည် small family အတွက်ဖြစ်သည်။ Data saved ဖြစ်ပြီး reminder config မအောင်မြင်လျှင် app ကသီးခြား error ပြသည်။

နေ့စဉ် ၈ နာရီဝန်းကျင် reminder သည် exact real-time push မဟုတ်ပါ။ App ဖွင့်ထားချိန် browser alerts လည်း generic reminder ပေးနိုင်သည်။ App ပိတ်ထားချိန် browser push မပါပါ။ iPhone/iPad တွင် email reminder ကိုအဓိကသုံးနိုင်သည်။

## ၈။ အဟောင်း Sheet data ရွှေ့ရန်

1. `apps-script/LegacyExport.gs.txt` helper ကို **မူလ Sheet-bound Apps Script editor ထဲသာ** တစ်ခုတည်းထည့်ပါ။ New Code.gs နှင့်မရောပါနှင့်။
2. `exportLegacyForMigration` ကို owner အဖြစ် manual Run လုပ်ပါ။ public GET/POST action အဖြစ်မထည့်ပါနှင့်။
3. Owner Drive ထဲ `FamilyVault-Legacy-private.json` ကိုရှာပြီး download လုပ်ပါ။ ဒီ export မှာ sensitive metadata ရှိနိုင်၍ private ထားပါ။
4. v2 Gmail ဝင် → unlock → Groups & settings → Legacy JSON import မှ file ကိုရွေးပါ။
5. Name/provider/bills/payment history ကို mapping လုပ်၍ encrypt လုပ်ပြီး new personal Sheet သို့ save မည်။ Source ကိုမဖျက်ပါ။
6. Original encrypted fields များရှိလျှင် format/key မပေးထားသဖြင့် auto-decrypt မလုပ်နိုင်ပါ။ Warning ပြပြီး user ရွေးမှ supported metadata ကိုသာ import မည်။ မူလ ciphertext/export ကိုထိန်းထားပြီး passwords ကို manual ပြန်ထည့်ပါ။
7. မူလ frontend ၏ billId မပါ payment မှတ်တမ်းများသည် unlinked payments ဖြစ်မည်။ Payment history → Status `All records` မှမြင်နိုင်သည်။
8. ဒီ importer ကိုတစ်ကြိမ်သုံးရန်ဖြစ်သည်။ တစ်ဖိုင်ထပ် import လုပ်လျှင် duplicate records ပေါ်မည်။
9. ရွှေ့ပြီး data စစ်၍ encrypted backup ယူပြီးမှ private plaintext migration export ကိုဖယ်ရန်စဉ်းစားပါ။ မူလ Sheet backup ကိုလိုသလိုထိန်းထားပါ။

HTML memory ထဲ sample state ကိုသာပြင်ထားပြီး Sheet မရောက်ခဲ့သော data ကို exporter ကပြန်မရနိုင်ပါ။ မူလ backend schema နှင့် frontend payload မကိုက်ခြင်းကြောင့် ပျောက်ခဲ့သော passwords ကို v2 က ခန့်မှန်း၍မပြန်တည်ဆောက်ပါ။

## ၉။ Squarespace / PWA

Firebase Hosting → Add custom domain မှ `vault.yourdomain.com` ထည့်၍ wizard ပြသော DNS records ကို Squarespace domain DNS Custom records ထဲ အတိအကျထည့်ပါ။ Root website နှင့် email MX records မဖျက်ပါနှင့်။ Certificate provision ပြီးချိန်စောင့်၍ Firebase Authentication Authorized domains ထဲ custom domain ထည့်ပါ။

အကိုးအကား: [Firebase custom domain](https://firebase.google.com/docs/hosting/custom-domain), [Squarespace DNS](https://support.squarespace.com/hc/en-us/articles/360002101888-Adding-DNS-records-to-your-domain)

Safari → Share → Add to Home Screen; supported Android/desktop browser → Install app။ Service worker သည် frontend shell ကိုသာ cache လုပ်သည်။ Login/load/save/docs သည် internet လိုသည်။ API tokens/vault responses ကို cache မလုပ်ပါ။

## ၁၀။ စမ်းသပ်ချက် / troubleshooting

Local automated tests: encryption tampering/wrong passphrase, document-key wrapping/passphrase change, Firebase+Google identity mismatch, cross-user Drive ownership, stale revision, metadata whitelisting, archive alerts, quarter/year boundaries, legacy linkage mapping။ Google cloud APIs ကို mock လုပ်၍ backend access rules စစ်ထားသည်။ Live OAuth/deployment/browser end-to-end ကို သင့် project credentials ဖြင့် စမ်းရန်လိုသည်။

- `access_denied`: allowlist နှင့် OAuth test users စစ်ပါ။
- `Google access denied`: Drive/Sheets APIs enable, Drive consent checkbox, API key restrictions စစ်ပါ။
- `Google permission expired`: Sign out → login ပြန်လုပ်ပါ။ Google OAuth access token ကိုပုံမှန် memory session အပြင် refresh မသိမ်းထားပါ။
- `Firebase login expired`: login ပြန်လုပ်ပါ။ Firebase API key နှင့် project ကိုစစ်ပါ။
- `operation failed` / passphrase မမှန်: correct passphrase သုံးပါ။ အခြား tab မှ passphrase ပြောင်းထားလျှင် Lock ပြန်လုပ်ပြီး new passphrase ဖြင့်ဖွင့်ပါ။
- `Vault busy`: ခဏစောင့်၍ပြန်စမ်းပါ။ တစ်နေ့တည်း record count ကြီးသို့ Apps Script quota ကျော်လျှင် quota စစ်ပါ။
- `Drive file missing`: Drive Trash/backup ကိုစစ်ပါ။ Vault Sheet metadata မဖျက်ပါနှင့်။
- Upload ပြီး save response ပျက်လျှင် Drive ထဲ encrypted orphan file ကျန်နိုင်သည်။ Network failure အချို့တွင် server save ရှိပြီးသားလည်းဖြစ်နိုင်သောကြောင့် file ကိုချက်ချင်းမဖျက်ပါနှင့်။ Refresh ဖြင့် state စစ်ပါ။
- Old PWA screen: tabs ပိတ်/ပြန်ဖွင့်; လိုအပ်လျှင် stale worker unregister လုပ်ပါ။

Production မသုံးမီ family Gmail နှစ်ခုဖြင့် records/docs သီးခြား၊ Sheets/Drive files သည် owner-only၊ wrong tokens/guess IDs access မရ၊ concurrent tabs conflict ပြ၊ backup ပြန်ဖွင့်ရကြောင်း စမ်းပါ။ File/folder ကို Drive share လုပ်လျှင် encryption ရှိသော်လည်း access model ပြောင်းလဲမည်။ Share မလုပ်ပါနှင့်။
