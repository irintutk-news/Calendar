# Calendar

เว็บปฏิทินใช้งานร่วมกันสำหรับคิวพิธีกร คิวทีม และเทียบวันว่าง ข้อมูลทุกหน้าจะซิงก์ผ่าน Supabase และคนที่มีลิงก์สามารถใช้งานได้โดยไม่ต้องมีบัญชี

1. สร้าง Supabase project แล้วรัน `supabase/schema.sql` หากเคยติดตั้งรุ่นก่อนให้รัน `supabase/upgrade-v5.sql` และ `supabase/upgrade-v6.sql` ตามลำดับ
2. อัปโหลดโฟลเดอร์ขึ้น GitHub แล้ว Import ใน Vercel
3. ใน Vercel ไปที่ Project Settings → Environment Variables แล้วเพิ่ม `SUPABASE_URL` และ `SUPABASE_PUBLISHABLE_KEY` ตาม `.env.example` ให้ครบทั้ง Production, Preview และ Development
4. Deploy ใหม่โดยไม่ต้องกำหนด Build Command (การเปลี่ยน Environment Variables จะมีผลกับ Deployment ใหม่เท่านั้น)

เว็บรองรับชื่อตัวแปรที่ Supabase/Vercel สร้างให้อัตโนมัติด้วย ได้แก่ `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` และชื่อเดิม `SUPABASE_ANON_KEY` โดยจะไม่ส่ง secret key หรือ service-role key ไปยังเบราว์เซอร์

ถ้ามุมขวาบนขึ้น `ยังไม่ได้ตั้งค่าฐานข้อมูล` แปลว่า Deployment นั้นยังไม่เห็น Environment Variables หากขึ้น `ยังไม่ได้ติดตั้งตารางข้อมูล` ให้เปิด SQL Editor ใน Supabase แล้วรัน `supabase/schema.sql` หนึ่งครั้ง

ใครมีลิงก์สามารถดูและแก้ไขได้ จึงควรแชร์ URL เฉพาะทีมงาน

ข้อมูลคิว รายชื่อ รูป วันว่าง และหมายเหตุถูกเก็บใน Supabase การอัปเดตไฟล์เว็บหรือ Deploy เวอร์ชันใหม่จะไม่ลบข้อมูลเดิม ห้ามรัน `schema.sql` ซ้ำกับฐานข้อมูลที่ใช้งานอยู่ ให้รันเฉพาะไฟล์ `upgrade-v*.sql` ที่ยังไม่เคยรันเท่านั้น

การบันทึกภาพ: กด `บันทึก JPG` ระบบจะแสดงภาพ 16:9 ขนาด 2560×1440 ให้ตรวจดูก่อน แล้วกด `ดาวน์โหลด JPG` ไฟล์จะตั้งชื่อตามชนิดตาราง ชื่อหัว และเดือนโดยอัตโนมัติ
