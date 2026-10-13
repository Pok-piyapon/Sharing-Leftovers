# Sharing Leftovers — User Workflow & System Journey (User Flow)

เอกสารสรุปขั้นตอนการทำงาน ลำดับการใช้งาน (User Flow) และเงื่อนไขทางเทคนิคสำหรับ **ผู้ใช้งานทั่วไปและสมาชิก (User Journey)** ตามข้อกำหนดระบบ Sharing Leftovers ฉบับสมบูรณ์ พร้อมปรับปรุงแก้ไขตามเกณฑ์ความพร้อมพัฒนา (Production-Ready Spec: P0, P1, P2)

---

## 📌 ภาพรวมวงจรชีวิตการแบ่งปัน (Lifecycle Overview)

```mermaid
flowchart LR
    A["1. ลงประกาศ<br>(Listing Created)"] --> B["2. ค้นหา & ดูรายละเอียด<br>(Public Discovery)"]
    B --> C["3. ขอรับของ & รอพิจารณา<br>(Pending Request)"]
    C --> D["4. อนุมัติ & นัดรับ<br>(Approved & Contact)"]
    D --> E["5. ส่งมอบสำเร็จ<br>(Completed by Owner)"]
```

---

## 1. Flow ผู้ขอรับสิ่งของ (Requester Flow)
*(เริ่มจากผู้เข้าชมทั่วไป Guest → เข้าสู่ระบบ → ส่งคำขอ → ติดตามสถานะ)*

```mermaid
flowchart TD
    GuestStart["Guest เข้าสู่หน้าแรก หรือ /listings"] --> SearchBrowse["ค้นหาของ: พิมพ์ชื่อ, เลือกหมวดหมู่, สภาพ<br>+ กรองพื้นที่ (GPS หรือ เลือกจังหวัด/อำเภอ/ตำบล)<br>+ จัดเรียง (latest, expiring, popular)"]
    SearchBrowse --> ViewDetail["คลิกเปิดหน้ารายละเอียด (/listings/:id)<br>(Guest ดูรูป, ชื่อ, สภาพ, พื้นที่คร่าวๆ ได้ทันที)"]
    ViewDetail --> PrivacyCheck["🛡️ Privacy by Design:<br>ซ่อนพิกัดแม่นยำ, ที่อยู่นัดรับละเอียด, และเบอร์โทร"]
    PrivacyCheck --> ClickClaim["คลิกปุ่ม 'ขอรับของชิ้นนี้'"]
    
    ClickClaim --> AuthCheck{"เข้าสู่ระบบแล้วหรือยัง?"}
    AuthCheck -- "ยังไม่เข้าสู่ระบบ (Guest)" --> RedirectAuth["นำทางไปยัง /auth?returnTo=/listings/:id?action=claim<br>(ป้องกัน Open Redirect: ต้องเป็น Internal Path)"]
    RedirectAuth --> AuthForm["หน้ายืนยันตัวตนรวม (Login / Register Tab)<br>สมัครใหม่ -> Auto-login อัตโนมัติ"]
    AuthForm --> RedirectBack["พากลับมาหน้ารายละเอียดเดิมพร้อม query ?action=claim"]
    
    AuthCheck -- "เข้าสู่ระบบแล้ว" --> ClaimModal["ระบบเปิด Modal ฟอร์มขอรับของอัตโนมัติ (ตรวจจับ ?action=claim)"]
    RedirectBack --> ClaimModal
    
    ClaimModal --> SubmitClaim["ระบุจำนวนที่ต้องการ + ข้อความฝากถึงเจ้าของ<br>(POST /api/v1/listings/:id/reservations)"]
    SubmitClaim --> PendingState["บันทึก Reservation: สถานะ pending<br>(ยังไม่ตัดสต็อกของในประกาศ)"]
    
    PendingState --> CentralTrack["ติดตามผลที่หน้า 'คำขอของฉัน' (/reservations/my)<br>🔔 มี Unread Notification Badge แจ้งเตือนเมื่อสถานะเปลี่ยน"]
    CentralTrack --> MarkRead["เมื่อผู้ใช้เปิดดูหน้า /reservations/my<br>-> รีเซ็ตสถานะการอ่าน (Badge หายไปอย่างถูกต้อง)"]
```

### รายละเอียดขั้นตอน:
1. **ค้นหาและเลือกดูสิ่งของ (Public Discovery & Fallback Filter):**
   * **Endpoint:** `GET /api/v1/listings` (Public Access สำหรับทุกคน)
   * **การค้นหาและตัวกรอง:** ค้นหาจากชื่อ (Text Search `search`), หมวดหมู่ (`category`), สภาพสิ่งของ (`condition`: `new`, `like_new`, `good`, `fair`, `poor`)
   * **ระบบตำแหน่งและตัวกรองพื้นที่:**
     * **กรณีเปิด GPS:** คำนวณระยะทางรอบตัวผ่านพิกัด `lat`, `lng` และรัศมี `radius` (เมตร)
     * **กรณีไม่ใช้ GPS (Fallback):** รองรับการค้นหาและกรองพื้นที่ด้วยตนเอง (Manual Location Filter) โดยเลือก **จังหวัด, อำเภอ, ตำบล**
   * **ตัวเลือกการเรียงลำดับ (Sorting Options):** รายการใหม่ล่าสุด (`sort=latest`), รายการใกล้หมดเวลา (`sort=expiring`), หรือยอดนิยม (`sort=popular`)
2. **การเปิดดูรายละเอียดและการคุ้มครองข้อมูลส่วนบุคคล (Privacy by Design):**
   * ผู้ใช้ทั่วไป (Guest) เปิดดูรายละเอียดสิ่งของ (`/listings/:id`) ได้อย่างอิสระโดยไม่ต้องเข้าสู่ระบบ
   * **ข้อมูลที่ Guest มองเห็นได้:** รูปภาพสิ่งของ, ชื่อ, หมวดหมู่, สภาพ, จำนวนคงเหลือ, รายละเอียดสิ่งของ, **พื้นที่ระดับอำเภอ/ตำบล หรือระยะทางโดยประมาณ**
   * **ข้อมูลที่ถูกปิดบัง (Masked):** **พิกัดแม่นยำ (lat/lng), ที่อยู่นัดรับแบบละเอียด (บ้านเลขที่/ซอย/สถานที่เฉพาะเจาะจง), และเบอร์โทรศัพท์** จะถูกปิดบังไว้ ไม่แสดงแก่ Guest หรือผู้ใช้ทั่วไป
   * ข้อมูลติดต่อและจุดนัดรับจริงจะเปิดเผยเฉพาะผู้ขอที่ได้รับการอนุมัติ (`status: "approved"`) แล้วเท่านั้น
3. **กดขอรับสิ่งของและการกลับมาทำรายการต่อ (Frictionless Auth & Safe ReturnTo):**
   * เมื่อคลิกปุ่ม **"ขอรับของชิ้นนี้"**:
     * หากเข้าสู่ระบบแล้ว $\rightarrow$ เปิดฟอร์มขอรับของทันที
     * หากเป็น Guest $\rightarrow$ นำทางไปยัง `/auth?returnTo=/listings/:id?action=claim`
   * **ความปลอดภัยของ `returnTo`:** ระบบตรวจสอบว่า `returnTo` ต้องเป็น Relative Path ภายในเว็บไซต์เท่านั้น (ขึ้นต้นด้วย `/` ห้ามเป็น URL ภายนอก เพื่อป้องกันช่องโหว่ Open Redirect)
   * **เปิดฟอร์มขอรับของต่อเนื่อง:** เมื่อ Login/Register สำเร็จ ระบบพากลับมายัง `/listings/:id?action=claim` โค้ดหน้าบ้านจะตรวจจับ parameter `action=claim` และเปิด Modal ฟอร์มขอรับของขึ้นมาให้ทันทีโดยที่ผู้ใช้ไม่ต้องกดซ้ำ
4. **ส่งคำขอรับของ:**
   * สมาชิกระบุจำนวนที่ต้องการรับ ($\le$ `availableQuantity`) และพิมพ์ข้อความถึงเจ้าของ
   * **กฎเหล็ก "หนึ่งคนขอรับได้ครั้งเดียวต่อประกาศ" (Single Lifetime Reservation per Listing):**
     * ผู้ใช้ 1 คนส่งคำขอได้เพียง 1 ครั้งต่อประกาศตลอดอายุประกาศ แม้คำขอเดิมจะถูกปฏิเสธ (`rejected`) หรือยกเลิก (`cancelled`) ไปแล้วก็ตาม (บังคับด้วย Unique Compound Index `{ listing: 1, requester: 1 }` ใน MongoDB)
     * หากผู้ใช้เคยส่งคำขอในประกาศนี้แล้ว ปุ่ม *"ขอรับของชิ้นนี้"* บนหน้า `/listings/:id` จะถูก Disable พร้อมแสดงข้อความเตือนว่า *"คุณเคยส่งคำขอสำหรับสิ่งของชิ้นนี้ไปแล้ว"* พร้อมลิงก์ไปหน้า `/reservations/my`
   * เรียก API: `POST /api/v1/listings/:id/reservations`
   * สถานะคำขอบันทึกเป็น **`pending`** (ยังไม่ตัดสต็อกของในประกาศ)
5. **การติดตามผลและการแจ้งเตือน (Centralized Tracking & Read Status Management):**
   * ใช้หน้า **"คำขอของฉัน" (`/reservations/my`)** เป็นศูนย์กลางในการตรวจสอบสถานะคำขอทั้งหมด
   * **กลไก Notification Badge & การนับสถานะการอ่าน:**
     * ในโมเดล `Reservation` มีฟิลด์ `isReadByRequester: { type: Boolean, default: false }`
     * เมื่อเจ้าของอนุมัติ (`approved`) หรือปฏิเสธ (`rejected`) ฟิลด์นี้จะถูกรีเซ็ตเป็น `false`
     * แถบ Navbar แสดง **Notification Badge (จุดแดง/ตัวเลขคำขอที่ยังไม่อ่าน)** ดึงจากจำนวนคำขอที่ `isReadByRequester === false`
     * **การเคลียร์ Badge:** เมื่อผู้ใช้เปิดเข้ามาดูหน้า `/reservations/my` ระบบจะอัปเดตคำขอเหล่านั้นเป็น `isReadByRequester = true` ทำให้ Badge หายไปอย่างถูกต้องและแม่นยำ
6. **ศูนย์รวมแดชบอร์ดสมาชิก (Member Space Navigation):**
   * หน้าแดชบอร์ด / พื้นที่ของฉัน (`/dashboard`) เป็นศูนย์กลางที่สมาชิกใช้สลับดู 2 บทบาทในบัญชีเดียว:
     * **แท็บ "คำขอของฉัน" (`/reservations/my`):** ติดตามสถานะของที่ตนเองขอรับ (`pending`, `approved`, `completed`) พร้อมจุดแจ้งเตือน Unread Badge
     * **แท็บ "ประกาศของฉัน" (`/users/me/listings`):** ดูสถานะของที่ตนเองลงแจก, จำนวนคงเหลือ, และเปิดดูคำขอที่ได้รับ
7. **การจัดการโปรไฟล์และความปลอดภัย (Profile & Security Flow):**
   * **ดูและแก้ไขข้อมูลส่วนตัว (`GET / PATCH /api/v1/users/me`):**
     * สมาชิกเปิดหน้า "โปรไฟล์ของฉัน" เพื่อดูข้อมูลตนเอง
     * สามารถแก้ไข: ชื่อที่แสดง (`name`), เบอร์โทรศัพท์ติดต่อ (`phone`), และที่อยู่ประจำตัว (`address`: ตำบล/อำเภอ/จังหวัด, `location`: พิกัด)
     * *(อีเมลถูกล็อกห้ามแก้ไข เพื่อความมั่นคงปลอดภัยของบัญชี)*
   * **เปลี่ยนรหัสผ่าน (`PATCH /api/v1/auth/password`):**
     * สมาชิกต้องกรอก: "รหัสผ่านปัจจุบัน" (`currentPassword`) และ "รหัสผ่านใหม่" (`newPassword`: ความยาวขั้นต่ำ 8 ตัวอักษร)
     * ระบบตรวจสอบรหัสผ่านเดิม หากถูกต้องจะเข้ารหัส hash และบันทึกใหม่ทันที


---

## 2. Flow ผู้ให้ของ / เจ้าของประกาศ (Owner Flow)
*(ลงประกาศ → ตรวจสอบคำขอ → อนุมัติจอง → ส่งมอบ → ปิดประกาศ)*

```mermaid
flowchart TD
    CreateStart["เจ้าของเข้าหน้าลงประกาศ (/listings/new)"] --> ValidateForm["กรอกข้อมูลตาม Validation Rules:<br>• บังคับ: title, category, condition, quantity (>=1), description, pickup<br>• รูปภาพ: บังคับอย่างน้อย 1 รูป (สูงสุด 5 รูป)<br>• วันหมดอายุ: expiresAt ในอนาคต"]
    ValidateForm --> PublishListing["บันทึกประกาศ -> status: available<br>(availableQuantity = quantity)"]
    
    PublishListing --> WaitClaim["ผู้ขอส่งคำขอเข้ามา (status: pending)"]
    WaitClaim --> CheckRequests["เจ้าของเปิดดูคำขอที่ได้รับ (/listings/:id/reservations)"]
    
    CheckRequests --> OwnerDecision{"การตัดสินใจของเจ้าของ"}
    
    OwnerDecision -- "ปฏิเสธคำขอ pending" --> RejectAction["PATCH /reservations/:id/reject<br>status เปลี่ยนเป็น rejected<br>(สต็อกไม่เปลี่ยนแปลง)"]
    
    OwnerDecision -- "อนุมัติคำขอ pending" --> AtomicDeduct["PATCH /reservations/:id/approve<br>ตัดจำนวน availableQuantity แบบ Atomic<br>status คำขอเปลี่ยนเป็น approved"]
    AtomicDeduct --> CheckReserved{"สต็อกคงเหลือเป็น 0 หรือไม่?<br>(availableQuantity == 0)"}
    CheckReserved -- "ใช่ (ของจองครบแล้ว)" --> SetReserved["ปรับสถานะประกาศเป็น reserved ชั่วคราว<br>(ยังไม่ใช่ completed)"]
    CheckReserved -- "ไม่ใช่ (ยังเหลือของ)" --> KeepAvail["สถานะประกาศคงเป็น available"]
    
    SetReserved --> MeetContact["เปิดเผยข้อมูลติดต่อและจุดนัดรับจริงแก่ผู้ขอ<br>ทั้งสองฝ่ายติดต่อส่งมอบของจริง"]
    KeepAvail --> MeetContact
    
    MeetContact --> PostApproveDecision{"สถานการณ์ระหว่างนัดรับ"}
    PostApproveDecision -- "นัดแล้วติดต่อไม่ได้ / ยกเลิกนัด" --> CancelApprove["เจ้าของหรือผู้ขอกดยกเลิกนัดหมาย<br>PATCH /reservations/:id/cancel<br>status คำขอ -> cancelled<br>คืนสต็อก availableQuantity 1 ครั้ง<br>(ถ้าประกาศเคย reserved ให้กลับเป็น available)"]
    
    PostApproveDecision -- "ส่งมอบสำเร็จจริง" --> DeliverDone["เจ้าของกด 'ยืนยันส่งมอบแล้ว'<br>PATCH /reservations/:id/complete<br>status คำขอ -> completed, บันทึก completedAt"]
    
    DeliverDone --> CheckAllDelivered{"ตรวจสอบฐานข้อมูลจริง:<br>sum(quantity ของ completed) == listing.quantity<br>และประกาศต้องยังไม่ cancelled หรือ expired?"}
    CheckAllDelivered -- "ครบถ้วนทั้งหมดจริง" --> SetListingComplete["ปรับสถานะประกาศเป็น completed ปิดรายการสมบูรณ์"]
    CheckAllDelivered -- "ยังส่งมอบไม่ครบ (มีของชิ้นอื่นเหลือ/รอส่งมอบ)" --> KeepState["คงสถานะประกาศไว้ (reserved หรือ available)"]
```

### รายละเอียดขั้นตอน:
1. **ลงประกาศแบ่งปัน (`/listings/new`):**
   * **Validation Rules ที่เข้มงวด:**
     * **ฟิลด์บังคับ (Required Fields):**
       * ชื่อสิ่งของ (`title`)
       * หมวดหมู่สิ่งของ (`category`: ObjectId หรือ slug ที่มีอยู่จริง)
       * สภาพสิ่งของ (`condition`: `new`, `like_new`, `good`, `fair`, `poor`)
       * จำนวนสิ่งของ (`quantity`: จำนวนเต็ม $\ge 1$)
       * **รายละเอียดสิ่งของ (`description`):** บังคับกรอก เพื่อความชัดเจนและโปร่งใส
       * **วิธีและพื้นที่รับของ (`pickup` เท่านั้น):**
         * กำหนดวิธีรับของเป็น **นัดรับด้วยตนเอง (`pickup.method: "pickup"`) เท่านั้น** (ไม่มีตัวเลือกจัดส่งพัสดุ)
         * บังคับระบุพื้นที่รับของ (`pickup.address` / จังหวัด, อำเภอ, ตำบล และพิกัดหากมี) โดยข้อมูลนัดรับแบบละเอียด (บ้านเลขที่/ซอย/พิกัดแม่นยำ) จะถูก Masked และเปิดเผยให้เฉพาะผู้ขอที่ได้รับการอนุมัติคำขอแล้วเท่านั้น
     * **รูปภาพสิ่งของ (`images`):**
       * **ระยะ MVP:** รับข้อมูลเป็น **URL รูปภาพ** (Array of Strings) บังคับกรอกอย่างน้อย 1 รูป (`min: 1`) และสูงสุด 5 รูป (`max: 5`) โดยระบบตรวจสอบรูปแบบ URL (`http://` หรือ `https://`) ก่อนบันทึก เพื่อเตรียมความพร้อมสำหรับการเปลี่ยนเป็นระบบอัปโหลดไฟล์จริงในระยะถัดไปโดยไม่ต้องแก้ไขโครงสร้างข้อมูล
     * **วันหมดอายุประกาศ (`expiresAt`):** ต้องระบุวันที่ในอนาคตที่สมเหตุสมผล
   * เผยแพร่ประกาศ $\rightarrow$ สถานะประกาศเริ่มต้นเป็น **`available`** (`availableQuantity = quantity`)
2. **ตรวจสอบคำขอที่ได้รับ (`/listings/:id/reservations`):**
   * เจ้าของเปิดดูรายชื่อผู้ขอ, จำนวนที่ขอ, วันที่ขอ และข้อความ
   * จำนวนคงเหลือบนหน้าประกาศยังคงเท่าเดิม เพื่อให้เจ้าของพิจารณาได้อย่างอิสระ
3. **การจัดการคำขอและ State Transition Matrix:**
   * **กรณีปฏิเสธคำขอ `pending`:**
     * เจ้าของกดปุ่ม *"ปฏิเสธ"* $\rightarrow$ เรียก `PATCH /api/v1/reservations/:id/reject`
     * สถานะคำขอเปลี่ยนเป็น **`rejected`** (สต็อกไม่ลดลงและไม่มีการคืนสต็อก เพราะไม่เคยตัด)
   * **กรณีอนุมัติคำขอ `pending`:**
     * เจ้าของกดปุ่ม *"อนุมัติ"* $\rightarrow$ เรียก `PATCH /api/v1/reservations/:id/approve`
     * ระบบตรวจสอบสต็อกและ **ตัดจำนวนคงเหลือแบบ Atomic** (`availableQuantity` ลดลงตามจำนวนที่ขอ)
     * สถานะคำขอเปลี่ยนเป็น **`approved`** บันทึก `approvedAt`
     * **กฎการเปลี่ยนสถานะของประกาศเมื่อสต็อกหมด:**
       * หากของถูกจองครบจนเหลือ 0 ชิ้น (`availableQuantity === 0`) ประกาศจะเปลี่ยนสถานะเป็น **`reserved` (จองเต็มแล้ว)** ชั่วคราว **(ยังไม่ใช่ `completed`)** เพื่อรอการส่งมอบจริง
   * **กรณียกเลิกคำขอหลังอนุมัติแล้ว (Cancel After Approved):**
     * เจ้าของหรือผู้ขอกดยกเลิกนัดหมาย $\rightarrow$ เรียก `PATCH /api/v1/reservations/:id/cancel`
     * สถานะคำขอเปลี่ยนเป็น **`cancelled`** บันทึก `cancelledAt`
     * ระบบคืนสต็อก (`availableQuantity += reservation.quantity`) **เพียงครั้งเดียว (Idempotent)**
     * **เงื่อนไขฟื้นสถานะประกาศ:** หากประกาศมีสถานะเป็น `reserved` ให้ปรับกลับมาเป็น `available` **(แต่หากประกาศถูก Admin สั่ง `cancelled`, `expired` หรือ `completed` ไปแล้ว ห้ามเปลี่ยนกลับมาเป็น `available` เด็ดขาด!)**
4. **ยืนยันการส่งมอบเสร็จสิ้น (One-Party Completion & Strict Completed Criteria):**
   * เมื่อเจ้าของส่งมอบของจริงตรงหน้าเรียบร้อย เจ้าของกดปุ่ม **"ยืนยันส่งมอบแล้ว"** $\rightarrow$ เรียก `PATCH /api/v1/reservations/:id/complete`
   * สถานะคำขอนั้นเปลี่ยนเป็น **`completed`** บันทึก `completedAt` ทันที (ฝ่ายเดียวจบงาน ไม่ต้องรอผู้รับกดยืนยัน)
   * **กติกาการเปลี่ยนสถานะประกาศเป็น `completed`:**
     * ประกาศจะเปลี่ยนสถานะเป็น **`completed`** ได้ก็ต่อเมื่อ:
       1. ประกาศปัจจุบันต้องไม่อยู่ในสถานะ `cancelled` หรือ `expired`
       2. ผลรวมของจำนวนในคำขอที่ส่งมอบสำเร็จจริง (`status === "completed"`) เท่ากับจำนวนทั้งหมดของประกาศ (`listing.quantity`)
          $$\sum_{\text{Reservation.status === 'completed'}} \text{reservation.quantity} = \text{listing.quantity}$$
     * **กรณีทดสอบของหลายชิ้น:** เช่น มีของ 3 ชิ้น ผู้รับ 2 คนรับไปแล้วคนละ 1 ชิ้น (`completed` รวม 2 ชิ้น) ยังเหลือ 1 ชิ้น ระบบต้องคงสถานะประกาศไว้ ไม่ปิดเป็น `completed` จนกว่าชิ้นที่ 3 จะส่งมอบจริงสำเร็จ

---

## 3. Flow การแก้ไขและยกเลิกประกาศ (Edit & Cancel Policy)
*(กฎเหล็กความโปร่งใสและกติกากลืนคำขอ Cascade Cancellation)*

```mermaid
flowchart TD
    ListingAction["เจ้าของเปิดดูประกาศของตนเอง"] --> CheckRes{"มีคำขอรับของเกิดขึ้นแล้วหรือยัง?<br>(Reservation.exists)"}
    
    CheckRes -- "ยังไม่มีคำขอใดๆ เลย" --> AllowEdit["อนุญาตให้แก้ไขข้อมูลประกาศได้ปกติ<br>(ชื่อ, รูป, รายละเอียด, สภาพ, วันหมดอายุ)"]
    
    CheckRes -- "มีคำขอเกิดขึ้นแล้ว (แม้เป็น pending)" --> StrictLock["🔒 ล็อกห้ามแก้ไขข้อมูลเด็ดขาดสำหรับทุกบทบาท!<br>(ทั้งเจ้าของ และ Admin ห้ามแก้ไขข้อมูล เพื่อป้องกันเปลี่ยนสภาพของ)"]
    StrictLock --> CanCancelOnly["แต่ยังคงอนุญาตให้ 'ยกเลิกประกาศ' ได้<br>(Soft Delete -> status: cancelled)"]
    
    CanCancelOnly --> CancelAction["เจ้าของ หรือ Admin กดยกเลิกประกาศ<br>(DELETE /api/v1/listings/:id)"]
    CancelAction --> CascadeCancel["⚡ จัดการคำขอที่ค้างอยู่ (Cascade Cancellation):<br>1. pending -> เปลี่ยนเป็น cancelled และห้ามอนุมัติอีก<br>2. approved (ยังไม่ส่งมอบ) -> เปลี่ยนเป็น cancelled และคืนสต็อกครั้งเดียว<br>3. completed -> คงสถานะประวัติเดิมไว้ ไม่ย้อนกลับ<br>4. ปิดประกาศเป็น cancelled ถาวร ไม่รับคำขอใหม่อีก<br>5. ป้องกันการคืนสต็อกซ้ำซ้อน (Idempotent Operation)"]
```

### รายละเอียดกฎเหล็ก:
1. **กฎการล็อกการแก้ไข (Strict Edit Lock for ALL Roles):**
   * เมื่อประกาศมีคำขอรับของเกิดขึ้นในระบบแล้ว (แม้จะมีเพียง 1 คำขอ และอยู่ในสถานะ `pending`) **ระบบจะล็อกห้ามแก้ไขข้อมูลประกาศโดยเด็ดขาดสำหรับทุกบทบาท (รวมถึง Admin)**
   * เพื่อป้องกันการแอบเปลี่ยนสภาพ จำนวน รูปภาพ หรือเงื่อนไขหลังมีคนส่งความจำนงขอรับของ
   * หากประกาศมีข้อผิดพลาดหรือผิดกฎ ให้ใช้การ **"ยกเลิกประกาศ" (Cancel Listing)** แทนเท่านั้น
2. **กติกาการจัดการคำขอเมื่อประกาศถูกยกเลิก (Cascade Cancellation & Idempotency):**
   * เมื่อประกาศถูกกดยกเลิก (ไม่ว่าจะกระทำโดย **เจ้าของประกาศ** หรือโดย **Admin**):
     * **คำขอที่ยัง `pending`:** ปิดคำขอโดยเปลี่ยนสถานะเป็น **`cancelled`** และไม่อนุญาตให้เจ้าของกดอนุมัติได้อีก
     * **คำขอที่ `approved` (ที่ยังไม่ได้ส่งมอบ):** เปลี่ยนสถานะเป็น **`cancelled`** และ **คืนสต็อกที่กันไว้กลับเข้าประกาศเพียงครั้งเดียว**
     * **คำขอที่ `completed`:** **คงสถานะเดิมไว้** เพื่อเก็บเป็นประวัติการรับ-ส่งมอบของที่เกิดขึ้นจริง ไม่ย้อนกลับ
     * **ประกาศที่ `cancelled`:** เปลี่ยนสถานะเป็น **`cancelled`** (Soft Delete) และ **ไม่รับคำขอใหม่เด็ดขาด**
     * **การป้องกันการคืนสต็อกซ้ำซ้อน (Idempotent Operation):** ดำเนินการตรวจสอบสถานะก่อนคืนสต็อก เพื่อป้องกัน Race Condition จากการกดยกเลิกซ้ำ

---

## 4. Flow การหมดอายุและการจัดการคำขอที่ค้างอยู่ (Expiry Policy)

```mermaid
flowchart TD
    CheckExpiry["ถึงกำหนดวันหมดอายุ (expiresAt)"] --> MarkExpired["ระบบปรับสถานะประกาศเป็น expired<br>(ปิดรับคำขอใหม่เด็ดขาด)"]
    MarkExpired --> HandlePending["คำขอที่ยัง pending ทั้งหมด<br>-> ปรับเป็น cancelled ทันที (ยุติการรอคอย)"]
    MarkExpired --> HandleApproved["คำขอที่ approved อยู่แล้ว<br>-> อนุญาตให้นัดส่งมอบต่อได้จนจบงานจริง"]
    
    HandleApproved --> ApprovedOutcome{"ผลการนัดหมายหลังหมดอายุ"}
    ApprovedOutcome -- "ส่งมอบสำเร็จจริง" --> OwnerComplete["เจ้าของกด Complete ได้ตามปกติ<br>(คำขอเป็น completed)"]
    ApprovedOutcome -- "ยกเลิก / ไม่มาตามนัด" --> CancelAfterExp["ปรับคำขอเป็น cancelled คืนสต็อกทางตัวเลข<br>⚠️ แต่ประกาศยังคงเป็น expired ไม่ฟื้นกลับมาเปิดรับใหม่!"]
```

1. **การหมดอายุของประกาศ (`status: "expired"`):**
   * เมื่อเวลาปัจจุบันเลยกำหนด `expiresAt` ระบบจะปรับสถานะประกาศเป็น **`expired`** ปิดการรับคำขอใหม่
2. **ผลต่อคำขอที่ยัง `pending`:**
   * คำขอที่ยังรอการอนุมัติอยู่จะถูก **Auto-cancel** ปรับเป็น `cancelled` ทันที เพื่อไม่ให้คำขอค้างคา และไม่อนุญาตให้เจ้าของกดอนุมัติย้อนหลัง
3. **ผลต่อคำขอที่ `approved` แล้ว:**
   * คำขอที่ได้รับการอนุมัติและนัดรับกันไว้แล้ว **ยังคงอนุญาตให้ดำเนินกระบวนการส่งมอบต่อได้จนจบ**
   * หากส่งมอบสำเร็จ เจ้าของกด Complete ได้ตามปกติ
   * หากการนัดหมายล้มเหลว คำขอจะถูกปรับเป็น `cancelled` มีการคืนสต็อกทางตัวเลข แต่ **ประกาศจะยังคงสถานะ `expired` ถาวร ไม่ถูกชุบชีวิตกลับมาเปิดรับใหม่**

---

## 5. Flow การรายงานปัญหาประกาศ (Report Listing Flow)
*(สำหรับสมาชิกแจ้งเบาะแสสิ่งผิดกฎหมายหรือไม่เหมาะสม)*

```mermaid
flowchart TD
    ViewBad["สมาชิกพบประกาศที่ผิดกฎ / ไม่เหมาะสม"] --> ClickReport["กดปุ่ม '🚩 รายงานปัญหา' บนหน้ารายละเอียดสิ่งของ"]
    ClickReport --> CheckAuthRep{"เข้าสู่ระบบแล้วหรือยัง?"}
    CheckAuthRep -- "ยังไม่ล็อกอิน" --> AuthPrompt["แจ้งเตือนให้เข้าสู่ระบบก่อนรายงาน"]
    CheckAuthRep -- "ล็อกอินแล้ว" --> OpenReportModal["เปิดหน้าต่าง Report Modal"]
    
    OpenReportModal --> FillReport["กรอกข้อมูลการรายงานปัญหา:<br>1. เลือกเหตุผลจากลิสต์ (Dropdown):<br>   • spam, inappropriate, fraud, illegal, wrong_information, other<br>2. ช่องรายละเอียดเพิ่มเติม (Description - Textarea)"]
    
    FillReport --> SubmitReport["กดยืนยันการรายงาน<br>POST /api/v1/listings/:listingId/reports"]
    SubmitReport --> SaveTicket["สร้าง Report Ticket สถานะ pending<br>ส่งเข้าคิวตรวจสอบของ Admin (/admin/reports)"]
    SaveTicket --> FeedbackUser["แสดง Toast แจ้งเตือน: 'ส่งรายงานเรียบร้อยแล้ว ทีมงานจะตรวจสอบโดยเร็ว'"]
```

* **API Endpoint ที่ใช้งาน:** `POST /api/v1/listings/:listingId/reports`
* **Path Parameter:** `:listingId` (ระบุประกาศที่รายงาน)
* **Request Body:**
  ```json
  {
    "reason": "illegal",
    "description": "พบสิ่งของต้องห้ามหรืออันตรายตามกฎหมาย"
  }
  ```
* **เหตุผลตาม Enum ในระบบ:** `spam`, `inappropriate`, `fraud`, `illegal`, `wrong_information`, `other`

---

## 6. ตารางสรุปการเปลี่ยนสถานะของระบบ (State Transition & Stock Matrix)

| สถานะปัจจุบันของคำขอ | ผู้กระทำ / เหตุการณ์ | Action / API Endpoint | สถานะใหม่ของคำขอ | ผลต่อสถานะประกาศ (`Listing.status`) | ผลต่อสต็อก (`availableQuantity`) |
| :---: | :--- | :--- | :---: | :---: | :--- |
| — | ผู้ขอส่งคำขอ | `POST /listings/:id/reservations` | `pending` | คงเดิม (`available`) | **ไม่ตัดสต็อก** (เท่าเดิม) |
| `pending` | เจ้าของปฏิเสธ | `PATCH /reservations/:id/reject` | `rejected` | คงเดิม (`available`) | ไม่เปลี่ยนแปลง |
| `pending` | ผู้ขอยกเลิก | `PATCH /reservations/:id/cancel` | `cancelled` | คงเดิม (`available`) | ไม่เปลี่ยนแปลง |
| `pending` | ประกาศหมดอายุ | ระบบตรวจพบ `expiresAt` | `cancelled` | เปลี่ยนเป็น `expired` | ไม่เปลี่ยนแปลง |
| `pending` | เจ้าของอนุมัติ | `PATCH /reservations/:id/approve` | `approved` | ถ้าสต็อกเหลือ 0 $\rightarrow$ `reserved`<br>ถ้ายังเหลือ $\rightarrow$ `available` | **หักลดลงทันที (Atomic)** |
| `approved` | ผู้ขอยกเลิกนัด | `PATCH /reservations/:id/cancel` | `cancelled` | ถ้าเคย `reserved` $\rightarrow$ คืนเป็น `available`<br>*(ถ้า `cancelled/expired` คงเดิม)* | **คืนสต็อก 1 ครั้ง (Idempotent)** |
| `approved` | เจ้าของยกเลิกนัด | `PATCH /reservations/:id/cancel` | `cancelled` | ถ้าเคย `reserved` $\rightarrow$ คืนเป็น `available`<br>*(ถ้า `cancelled/expired` คงเดิม)* | **คืนสต็อก 1 ครั้ง (Idempotent)** |
| `approved` | เจ้าของยืนยันส่งมอบ | `PATCH /reservations/:id/complete` | `completed` | เป็น `completed` ก็ต่อเมื่อ<br>$\sum \text{completed} = \text{listing.quantity}$ | ไม่คืนสต็อก (ส่งมอบสำเร็จ) |
| Any | ประกาศถูกยกเลิก | `DELETE /listings/:id` | • `pending` $\rightarrow$ `cancelled`<br>• `approved` $\rightarrow$ `cancelled`<br>• `completed` $\rightarrow$ คงเดิม | **`cancelled`** (ปิดถาวร) | คืนสต็อกเฉพาะคำขอที่เคย `approved` เพียงครั้งเดียว |

---

## 7. โครงสร้างหน้าจอและสิทธิ์ที่เกี่ยวข้อง (Sitemap Integration)

```text
Sharing Leftovers
│
├── 1. หน้าสาธารณะ (Public & Guest)
│   ├── หน้าแรก (/)
│   ├── ค้นหาและดูรายการสิ่งของ (/listings)  <-- ค้นหาชื่อ, หมวดหมู่, สภาพ, GPS, กรองจังหวัด/อำเภอ/ตำบล, จัดเรียง
│   ├── หน้ารายละเอียดสิ่งของ (/listings/:id) <-- Guest ดูได้ (Mask พิกัดแม่นยำ/ที่อยู่ละเอียด/เบอร์โทร) + ปุ่มแจ้งรายงาน
│   └── หน้าเข้าสู่ระบบและสมัครสมาชิก (/auth) <-- รวม Login & Register, สมัครเสร็จ Auto-login ทันที
│
├── 2. พื้นที่สมาชิก (Member Space)
│   ├── แดชบอร์ด / พื้นที่ของฉัน (/dashboard)
│   │   ├── ข้อมูลโปรไฟล์ตนเอง (/users/me)
│   │   ├── ประกาศของฉัน (/users/me/listings)
│   │   ├── คำขอรับของของฉัน (/reservations/my)  <-- ศูนย์กลางติดตามสถานะ + Unread Notification Badges
│   │   └── เปลี่ยนรหัสผ่าน (/auth/password)
│   ├── ลงประกาศใหม่ (/listings/new)           <-- Form Validation บังคับรูป 1-5 รูป, บังคับรายละเอียด
│   ├── แก้ไขประกาศ (/listings/:id/edit)        <-- ล็อกห้ามแก้ไขเด็ดขาดสำหรับทุกบทบาทเมื่อมีคำขอแล้ว
│   └── จัดการคำขอที่ได้รับในประกาศ (/listings/:id/reservations)
│
└── 3. พื้นที่ผู้ดูแลระบบ (Admin Space - เฉพาะ role: "admin")
    ├── หน้าภาพรวมผู้ดูแลระบบ (/admin)
    ├── ตารางจัดการประกาศทั้งหมด (/admin/listings) <-- ค้นหา กรอง และจัดการประกาศผิดกฎจากหลังบ้าน
    ├── จัดการสมาชิกในชุมชน (/admin/users)
    ├── จัดการหมวดหมู่สิ่งของ (/admin/categories)
    └── ตรวจสอบรายงานปัญหา (/admin/reports)
```