import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Otty V2</p>
        <h1>Employee platform scaffold</h1>
        <p className="lead">
          หน้า root ถูกเคลียร์ไว้สำหรับ implementation จริงของแอป ส่วน flow
          ทดลองที่ใช้เช็ก LINE login และ profile resolver ถูกย้ายไปไว้ใต้
          `/dev`
        </p>
      </section>

      <section className="info-grid">
        <Link className="nav-card" href="/profile">
          <p className="eyebrow">Live Flow</p>
          <h2>Open Profile</h2>
          <p className="lead lead--compact">
            เมื่อกดเข้า link นี้ ระบบจะเช็ก LINE login แล้วแสดง employee
            profile จาก collection `users` ทันที
          </p>
        </Link>

        <Link className="nav-card" href="/dev">
          <p className="eyebrow">Development</p>
          <h2>Open Dev Routes</h2>
          <p className="lead lead--compact">
            รวม path ทดลองสำหรับ LIFF login และ profile lookup จาก MongoDB
          </p>
        </Link>
      </section>
    </main>
  );
}
