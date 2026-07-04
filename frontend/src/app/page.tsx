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
            System Online (Skeleton)
          </div>
        </div>
      </header>

      <main className="main container" style={{ minHeight: "calc(100vh - 180px)" }}>
        <section className="hero">
          <h1 className="hero-title">
            LMS - Portal Đăng Nhập<br />
            <span>TRS Rebuild System</span>
          </h1>
          <p className="hero-desc">
            Hệ thống Quản lý Bài tập lớn, chấm bài tự động và đề xuất học tập. 
            Được phát triển riêng cho việc phân tích, theo dõi và gợi ý kiểm thử mã nguồn của sinh viên.
          </p>
          
          <div style={{ marginTop: "2.5rem" }}>
            <Link href="/login" className="btn btn-primary" style={{ padding: "1rem 2rem", fontSize: "1.1rem" }}>
              🔓 Truy cập cổng đăng nhập (Google OAuth)
            </Link>
          </div>
        </section>

        <section className="tech-panel">
          <h3 className="tech-panel-title">📡 Trạng thái Dịch vụ & Cấu hình Docker</h3>
          <div className="tech-grid">
            <div className="tech-item">
              <span className="tech-name">Frontend Portal</span>
              <span className="tech-val">Next.js + TypeScript</span>
              <span className="tech-status">Port: 3100 (Active)</span>
            </div>
            <div className="tech-item">
              <span className="tech-name">Backend API (Flask)</span>
              <span className="tech-val">http://localhost:5102</span>
              <span className="tech-status">GET /api/health</span>
            </div>
            <div className="tech-item">
              <span className="tech-name">Grader API (Flask)</span>
              <span className="tech-val">http://localhost:5103</span>
              <span className="tech-status">GET /api/health</span>
            </div>
            <div className="tech-item">
              <span className="tech-name">Database (PostgreSQL)</span>
              <span className="tech-val">Host: db | Port: 55432</span>
              <span className="tech-status">DB: trs_db (trs_user)</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <p>© 2026 TRS Rebuild Skeleton. Được thiết kế cho sinh viên năm 3 Công nghệ Thông tin.</p>
        </div>
      </footer>
    </>
  );
}
