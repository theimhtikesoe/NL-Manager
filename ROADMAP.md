# 🛠️ NL-Manager: Project Detail Specification

ဒီ Project ကို ရိုးရိုး Admin Panel မဟုတ်ဘဲ စက်ရုံရဲ့ စည်းကမ်းတွေကို Data နဲ့ ထိန်းချုပ်မယ့် **"Smart Industrial Workflow & Accountability SaaS"** အဖြစ် ပြောင်းလဲပစ်မယ်။ စက်ဆရာရဲ့ စိုးရိမ်မှုတွေနဲ့ Phyaephyoko ပြောပြတဲ့ လက်တွေ့အလုပ်လုပ်ပုံ (Business Rules) တွေကို အခြေခံပြီး တည်ဆောက်မယ့် **System Specification & Implementation Roadmap** ကို အသေးစိတ် ချရေးပေးလိုက်တယ်။

## ၁။ System Architecture & State Engine (မီးလာ/မီးပျက် Dynamic Logic)

စက်ရုံက မီးလာချိန်နဲ့ မီးပျက်ချိန် လုပ်ရတဲ့ အလုပ်တွေ မတူတဲ့အတွက် စနစ်တစ်ခုလုံးရဲ့ အလုပ်လုပ်ပုံကို **Factory State (Global Status)** တစ်ခုနဲ့ ထိန်းချုပ်မယ်။

* **Global Modes:**
    * **POWER_ON (မီးလာချိန်):** Tube စက်၊ ဗူးစက်တွေ အပြည့်လည်ပတ်ပြီး မိနစ် ၃၀/၄၀ တစ်ခါ ကော်ဖြည့်ရမယ့် လုပ်ငန်းစဉ်တွေကို အဓိက Run တယ်။
    * **POWER_OFF (မီးပျက်ချိန်):** စက်လည်ပတ်မှု Tasks တွေကို ခဏ Freeze လုပ်ထားပြီး အုတ်ကန်ရေစစ်တာ၊ သန့်ရှင်းရေးလုပ်တာမျိုးကို Dynamic Tasks အဖြစ် ပြောင်းလဲပေးတယ်။
* **tRPC Context Input:** Frontend ကနေ ခေါ်သမျှ တာဝန် (Tasks) အားလုံးက လက်ရှိ Factory Mode ပေါ်မူတည်ပြီး အလိုအလျောက် ပြောင်းလဲနေမယ်။

## ၂။ Database Schema Extensions (Drizzle ORM)

လက်ရှိ Schema ကို အလုပ်သမားတွေရဲ့ အချိန်ခိုးမှု (Time Theft) နဲ့ တာဝန်ပျက်ကွက်မှုကို ဒေတာအဖြစ် ဖမ်းဆုပ်နိုင်ဖို့ အောက်ပါအတိုင်း အသေးစိတ် တိုးချဲ့မယ်။

### A. factory_modes (စက်ရုံတစ်ခုလုံး၏ Live မီးအခြေအနေ)
* id (Primary Key)
* current_mode (Enum: POWER_ON, POWER_OFF)
* updated_at (Timestamp)
* updated_by (Admin/စက်ဆရာ ID)

### B. worker_activity_logs (အပြင်ထွက်ခြင်း၊ ထမင်းစားခြင်းနှင့် ကားလာခြင်း Track Record)
* id (Primary Key)
* worker_id (Foreign Key -> workers.id)
* activity_type (Enum: LUNCH [ထမင်းစား], GENERAL_BREAK [အပြင်ထွက်/ဆေးလိပ်], CAR_LOADING [ပစ္စည်းတင်ကားလာခြင်း])
* start_time (Timestamp)
* end_time (Timestamp, Nullable)
* duration_minutes (Generated/Calculated Column)
* compliance_status (Enum: WITHIN_LIMIT, OVERTIME [အချိန်ကျော်], PENDING)

### C. tasks (သတ်မှတ် Frequency များနှင့် ချိတ်ဆက်မှု)
* id (Primary Key)
* task_name (e.g., "Tube စက် ကော်ဖြည့်ခြင်း - အဖြူ", "Cooler ရေစစ်ခြင်း")
* frequency_minutes (Int - ဥပမာ: 30, 40, 1440 [Daily], 10080 [Weekly])
* trigger_mode (Enum: POWER_ON, POWER_OFF, ANY)
* machine_code (Foreign Key -> machines.machine_code)

## ၃။ Core Modules & Features (ဘာတွေလုပ်မလဲ)

### 📱 A. Worker Mobile Workspace (အလုပ်သမားများ သုံးမည့် ဖုန်း Layout)
အလုပ်သမားတွေက Dashboard ကြီးကို ကြည့်နေစရာမလိုဘူး။ သူတို့ဖုန်းထဲမှာ PWA Layout နဲ့ ခလုတ် ၃ ခုပဲ မြင်ရမယ်။
1. **Scan QR Code Button:** စက်ဆီသွားပြီး QR စကန်ဖတ်ကာ အလုပ်ပြီးကြောင်း တင်ရမယ် (Check-in / Task Done)။
2. **Break Management Buttons:**
    * "ထမင်းစားထွက်မယ်" (Start Lunch) -> စနစ်က မိနစ် ၂၀ စမှတ်မယ်။ ပြန်လာရင် စက်နားက QR ကို ပြန်စကန်ဖတ်ရမယ်။
    * "အပြင်ခဏထွက်မယ်" (Start Break) -> စနစ်က ၁၅ မိနစ် စမှတ်မယ်။
3. **Active Task Reminder:** "နောက်ထပ် ကော်ဖြည့်ရန် ၁၂ မိနစ် ကျန်ပါသည်" ဆိုပြီး စာသားကြီးကြီးပြထားမယ်။

### 🖥️ B. Supervisor Dashboard (စက်ဆရာနှင့် မင်းကြည့်မည့် Command Center)
တကယ့် Industrial Command Center Vibe အပြည့် ထည့်မယ်။
1. **Live Factory State Switch:** ထိပ်ဆုံးမှာ မီးလာခြင်း (🟢) / မီးပျက်ခြင်း (🔴) ကို Switch လုပ်မယ့် Toggle ခလုတ်။
2. **Worker Attendance & Break Grid:**
    * ဘယ်သူတွေ အလုပ်ထဲမှာရှိနေလဲ၊ ဘယ်သူတွေ အပြင်ထွက်နေလဲ။
    * ထမင်းစားထွက်တာ ၂၀ မိနစ်ကျော်သွားတဲ့ကောင်တွေရဲ့ Card က **အနီရောင်** ပြောင်းပြီး Blink ဖြစ်နေမယ်။
3. **Machine Status Tracker (Tube, Cooler, Tower):**
    * Cooler ရေစစ်တာ ၂၄ နာရီကျော်သွားရင် Missing Check လို့ ပြမယ်။
    * Tube စက်နားမှာ လူ ၂ ယောက်လုံး မရှိဘဲ တစ်ယောက်ပဲ ကျန်နေရင် စနစ်က Alert ထုတ်ပေးမယ်။

### 📈 C. Accountability & Payroll Analytics (လကုန် အပြစ်မှတ်တမ်း Report)
အလုပ်သမားတွေကို Data နဲ့ စကားပြောဖို့ လကုန်ရင် PDF Report ထုတ်ပေးမယ့် Module။
* **Metrics Tracked:**
    * Total Overtime Breaks (သတ်မှတ်မိနစ်ထက် ပိုပျောက်သွားတဲ့ အကြိမ်ရေ)
    * Missed Tasks (ကော်ဖြည့်ဖို့/ရေစစ်ဖို့ အချိန်မီ Scan မဖတ်ဘဲ ကျော်သွားတဲ့ အကြိမ်ရေ)
    * Shift Efficiency (သတ်မှတ်ထားတဲ့ စက်လည်ပတ်မှုအချိန်အတွင်း တာဝန်ကျေပွန်မှု ရာခိုင်နှုန်း)

## 🚀 Execution Phase / Roadmap (အကောင်အထည်ဖော်မည့် အဆင့်များ)

### Phase 1: Infrastructure Fixing (အုတ်မြစ်ပြင်ခြင်း)
* tRPC Client Config နဲ့ Environment Variables (DATABASE_URL, JWT_SECRET) Error တွေကို Debug လုပ်ပြီး Production Environment အလုပ်လုပ်အောင် ပြင်မယ်။

### Phase 2: Core Database Update & tRPC Routers
* `workerActivityLogs` နဲ့ `factory_modes` Schema တွေကို Drizzle မှာ ရေးပြီး Database ထဲ db push လုပ်မယ်။
* အလုပ်သမား အပြင်ထွက်တာ၊ ပြန်ဝင်တာ၊ တာဝန်ပြီးမြောက်တာတွေကို စစ်ဆေးမယ့် tRPC Mutations/Procedures တွေ ဆောက်မယ်။

### Phase 3: Mobile-First Frontend Implementation
* အလုပ်သမားတွေ ဖုန်းနဲ့ Scan ဖတ်ပြီး ရိုက်ထည့်မယ့် UI ကို shadcn/ui နဲ့ Tailwind CSS v4 သုံးပြီး တည်ဆောက်မယ်။
* Vite ထဲမှာ QR Code Scanner Library တစ်ခု (ဥပမာ: html5-qrcode သို့မဟုတ် react-qr-reader) ကို Integrations လုပ်မယ်။

### Phase 4: Supervisor Command Center & Alerts
* စက်ဆရာ ထိုင်ကြည့်ပြီး ဒေတာ သွင်း/ထုတ် လုပ်နိုင်မယ့် Analytics Charts တွေနဲ့ Live Alert Grid တွေကို Frontend Main Dashboard မှာ တင်မယ်။
