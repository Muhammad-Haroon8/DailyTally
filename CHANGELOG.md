# Changelog

All notable changes to the Daily Tally application are documented in this file.

---

## Version [1.1.0] - 2026-09-07

### Naye Features (New Features)
- **Mukammal Wholesaler / Supplier Module**: Ab aap wholesalers (jinse maal/saman khareedte hain) ka bhi mukammal hisab kitab rakh sakte hain — unki profile, purchases (kharedari), payments (adaigi), aur baqi baqaya ka pura hisab ek jagah dastiyab hai.
- **Wholesaler Items Catalog (Manage Items)**: Wholesalers ke liye alag se items aur default rates save karne ki sahulat (jaise Siri, Jore, waghaira) taake purchase enter karte waqt bar bar rate na likhna pare.
- **Purchase Entry me Extra aur Kam (Shortage) Adjustment**: Maal aane par agar koi item extra aaya ho ya kam nikla ho, toh dono ko ek sath multiple items ke sath darj karne ki sahulat (+ button se jitne chahein items add karein) jo bill ke kul amount ko khud ba khud hisab me le leta hai.
- **Advance Pool Tracker ("Advance Dein")**: Wholesaler ko pehle se di gayi advance raqam ko ek alag pool me mehfooz rakhne ka nizam, taake pata rahe ke kitna advance unke paas jama hai.
- **Advance Se Katoti ("Advance Se Katein")**: Haftay (week) ke bill me se advance pool me se raqam kaatne (settlement) ki sahulat, jisme tarikh aur waqt ka intikhab shamil hai. Isse haftay ka baqi baqaya bhi kam hota hai aur advance pool se bhi utni raqam kat jati hai.
- **Wholesaler PDF Reports ("Report Bhejein")**: Wholesaler ka hisab kitab PDF format me export aur share (WhatsApp waghaira) karne ki sahulat:
  - Wholesaler Detail Screen se custom date-range ya mahine/hafte ki report.
  - Mahine aur Hafte ke screens se foran usi time period ki 1-tap PDF report.
  - Report me rozana ki kharedari, payment, extra/shortage items ki tafseelat aur advance ka hisab saaf aur wazeh taur par shamil hai.

### Sudhaar / Behtar Banaya Gaya (Improvements)
- **Home aur Profile Screen ki Nayi Tarteeb**: Home screen aur dashboard par business-wide summary card shamil kiya gaya jisme customer ke sath sath ab wholesaler ke kul kharedari, payment aur baqi baqaya ka overview ek nazr me dikhta hai.
- **Unified & Professional PDF Generator**: Customer aur Wholesaler dono ke liye ek shared backend PDF service banayi gayi, jisme Urdu text (Unicode font) ki behtar rendering, company header, saaf suthra ledger table aur summary cards shamil hain.
- **Fast Local Caching**: Wholesaler list, detail, monthly summary aur item catalog ke liye offline local cache shamil kiya gaya, taake screen kholte hi data foran load ho aur internet slow hone par bhi app taiz chale.
- **Filter & Quick Navigation**: Entries ko type ke mutabiq filter karne (Kharedari / Adaigi / Advance / Katoti) aur hafte/mahine ke darmiyan asani se navigate karne ki sahulat.

### Bug Fixes
- **Advance Deduction ki Date Fix**: "Advance Se Katein" modal me date aur time ka intikhab na hone ki wajah se wo entry us hafte ke hisab me shamil nahi ho rahi thi — ab date/time picker ke sath har katoti us hafte ke hisab me bilkul theek se hisab hoti hai.
- **Advance Deduction Edit & Delete**: Hafte aur mahine ki screen par advance katoti ("Advance Se Kata") wali entry par tap karke uski raqam, date ya note edit karne aur delete karne ki salahiyat theek kar di gayi.
- **Extra aur Kam Aya Toggle Bug**: Pehle purchase entry me Extra aur Kam dono me se sirf ek select ho sakta tha — ab dono sections bilkul azaad hain aur ek hi delivery me extra aur shortage dono items ek sath darj ho sakte hain.
- **Customer WeekDetailScreen Data Empty Bug**: Customer ka hafta kholte waqt data kabhi kabhar khali ya loading me atak jata tha — caching aur state synchronization ko theek kar diya gaya.
