# Calendar Host Edit/Delete Patch

ไฟล์นี้เพิ่มความสามารถแก้ไขและลบรายชื่อพิธีกร/ทีมงานจากหน้า “รูปและรายชื่อ”

วิธีใช้:
1. นำ `index.html` ไปแทนไฟล์เดิมที่ root ของ repo
2. เพิ่ม `assets/people-management.js`
3. Commit / Push ขึ้น GitHub
4. Vercel จะ Deploy ใหม่อัตโนมัติ

พฤติกรรม:
- แก้ไขชื่อ หมวด/ตำแหน่ง สี และอัปโหลดรูปใหม่
- ลบรายชื่อพร้อมหน้าต่างยืนยัน
- การลบคนจะลบข้อมูลที่อ้างถึงคนนั้นผ่าน Foreign Key ON DELETE CASCADE ใน Supabase
