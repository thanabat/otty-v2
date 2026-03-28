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
        <Link className="nav-card" href="/dev">
          <p className="eyebrow">Development</p>
          <h2>Open Dev Routes</h2>
          <p className="lead lead--compact">
            รวม path ทดลองสำหรับ LIFF login และ profile lookup จาก MongoDB
          </p>
        </Link>

        <article className="info-card">
          <h2>Next Build Target</h2>
          <p className="lead lead--compact">
            จากจุดนี้คุณสามารถเริ่ม implement flow จริง เช่น auth module,
            session, และ employee-facing pages โดยไม่ปะปนกับ prototype เดิม
          </p>
        </article>
      </section>
    </main>
  );
}
