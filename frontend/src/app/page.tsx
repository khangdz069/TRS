import Link from "next/link";

export default function Home() {
  return (
    <>
      <div className="bg-glow-mesh"></div>

      <header className="header">
        <div className="container header-container">
          <Link href="/" className="logo">
            TRS <span className="logo-badge">Rebuild</span>
          </Link>
          <div className="sys-status">
            <span className="sys-dot"></span>
            System Online
          </div>
        </div>
      </header>

      <main className="main container" style={{ minHeight: "calc(100vh - 180px)" }}>
        <section className="hero">
          <h1 className="hero-title">
            LMS - Portal đăng nhập<br />
            <span>TRS Rebuild System</span>
          </h1>
          <p className="hero-desc">
            Hệ thống quản lý bài tập lớn, chấm bài tự động và đề xuất testcase học tập.
            Được phát triển riêng cho việc phân tích, theo dõi và gợi ý kiểm thử mã nguồn của sinh viên.
          </p>

          <div style={{ marginTop: "2.5rem" }}>
            <Link href="/login" className="btn btn-primary" style={{ padding: "1rem 2rem", fontSize: "1.1rem" }}>
              Truy cập cổng đăng nhập
            </Link>
          </div>
        </section>

        <section className="tech-panel">
          <h3 className="tech-panel-title">Trạng thái dịch vụ và cấu hình Docker</h3>
          <div className="tech-grid">
            <div className="tech-item">
              <span className="tech-name">Frontend Portal</span>
              <span className="tech-val">Next.js + TypeScript</span>
              <span className="tech-status">Port: 3100</span>
            </div>
            <div className="tech-item">
              <span className="tech-name">Backend API</span>
              <span className="tech-val">Spring Boot - http://localhost:5102</span>
              <span className="tech-status">GET /api/health</span>
            </div>
            <div className="tech-item">
              <span className="tech-name">Grader API</span>
              <span className="tech-val">Spring Boot - http://localhost:5103</span>
              <span className="tech-status">GET /api/health</span>
            </div>
            <div className="tech-item">
              <span className="tech-name">Database</span>
              <span className="tech-val">PostgreSQL - localhost:55432</span>
              <span className="tech-status">DB: trs_db (trs_user)</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <p>© 2026 TRS Rebuild. Được thiết kế cho môn học lập trình và kiểm thử.</p>
        </div>
      </footer>
    </>
  );
}
