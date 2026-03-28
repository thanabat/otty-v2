import Link from "next/link";

const entries = [
  {
    href: "/dev/line",
    title: "LINE Login Check",
    description:
      "Step 1 prototype สำหรับเช็ก LIFF login, token และข้อมูล LINE profile"
  },
  {
    href: "/dev/profile",
    title: "Profile Resolver",
    description:
      "Step 2 prototype สำหรับ lookup collection users ด้วย line_user_id แล้วแสดง employee profile"
  }
];

export default function DevHomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Development Routes</p>
        <h1>Prototype flows are kept under `/dev`</h1>
        <p className="lead">
          ใช้ path กลุ่มนี้สำหรับดู flow ทดลองระหว่างพัฒนา ส่วน path หลักของแอป
          จะได้ว่างไว้สำหรับ implementation จริงในรอบถัดไป
        </p>
      </section>

      <section className="info-grid">
        {entries.map((entry) => (
          <Link key={entry.href} className="nav-card" href={entry.href}>
            <p className="eyebrow">{entry.href}</p>
            <h2>{entry.title}</h2>
            <p className="lead lead--compact">{entry.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
