# Glossary

Agreed terms for the interface text. Use these exact words in every dictionary file so the same thing is
always called the same name. Native reviewers: change a term here first, then everywhere it appears.

| Concept | Georgian (ka) | Russian (ru) | Turkish (tr) | Armenian (hy) |
|---|---|---|---|---|
| Verified manufacturer (badge) | დადასტურებული მწარმოებელი | Проверенный производитель | Doğrulanmış üretici | Ստուգված արտադրող |
| Approved seller | დამტკიცებული გამყიდველი | Одобренный продавец | Onaylı satıcı | Հաստատված վաճառող |
| Cart / basket | კალათა | Корзина | Sepet | Զամբյուղ |
| Checkout | შეკვეთის გაფორმება | Оформление заказа | Siparişi tamamla | Պատվերի ձևակերպում |
| Payout | ანაზღაურება | выплата | hakediş | վճարում |
| Payment reference | დანიშნულება | Назначение платежа | Ödeme açıklaması | Վճարման նպատակ |
| Quotation | შეთავაზება | коммерческое предложение | teklif | գնային առաջարկ |
| Commission | საკომისიო | комиссия | komisyon | միջնորդավճար |
| Seller portal | გამყიდველის პორტალი | Кабинет продавца | Satıcı paneli | Վաճառողի վահանակ |
| Site inspection | ადგილზე ინსპექცია | выездная проверка | yerinde denetim | ստուգայց |
| Brand name | Bazari | Bazari | Bazari | Bazari |
| Test mode | სატესტო რეჟიმი | Тестовый режим | Test modu | Թեստային ռեժիմ |

Notes:

- Currency is always the Georgian lari, written with the ₾ sign after the amount, in every language.
- Addressing the user: Russian uses «Вы», Armenian uses «Դուք/Ձեր» (capitalised), Turkish uses the polite plural.
- The brand is always written **Bazari** in Latin letters, also in Georgian, Russian and Armenian text, so it reads as a name and not the common word ბაზარი (market). Endings attach as they do to any Latin name ending in -i: Bazari-ზე, Bazari-ის, Bazari-მ (ka), Bazari'de, Bazari'nin, Bazari'ye (tr), Bazari-ում, Bazari-ի, Bazari-ն (hy); Russian leaves it undeclined («на Bazari»).
- Turkish strings avoid attaching case suffixes to inserted names, so no vowel-harmony logic is needed.
- Russian counts use `plural()` (`src/i18n/plural.ts`), backed by `Intl.PluralRules`.
