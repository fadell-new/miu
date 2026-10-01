# MIU Trade League (Vercel + Neon edition)

เว็บจำลองเทรดด้วยเงิน MIU ปลอม รันบน Vercel + Neon Postgres ไม่เกี่ยวกับ Higgsfield

## สิ่งที่ต้องมี

- บัญชี Neon (ฟรี) สำหรับฐานข้อมูล: https://neon.tech
- บัญชี Vercel (ฟรี) + GitHub

## ขึ้น Production

1. Neon > New Project ชื่อ `miu` region `Singapore` แล้วกด Connect เอา connection string มา
2. ยิงตาราง (Windows PowerShell ในโฟลเดอร์นี้):
   ```powershell
   $env:DATABASE_URL="postgresql://..."; bun run migrate
   ```
3. push โค้ดขึ้น GitHub
4. Vercel > Add New Project > Import repo นี้ (Framework ขึ้น TanStack Start เอง)
5. ใส่ Environment Variable: `DATABASE_URL` แล้ว Deploy
6. ได้โดเมนจริงแล้วค้น `miu-trade.vercel.app` ใน `src/routes/index.tsx`
   กับ `src/routes/__root.tsx` แทนด้วยโดเมนจริง แล้ว redeploy

## รันในเครื่อง

```bash
bun install
$env:DATABASE_URL="postgresql://..."; bun run dev
```

 dev ต้องต่อ Neon เสมอ (ไม่มีไฟล์ db ในเครื่องแล้ว)
