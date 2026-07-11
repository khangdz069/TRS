import Link from "next/link";

export default function Home() {
  return (
    <>
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

      <main className="home-hero">
        <div className="container home-hero-grid">
          <section className="hero">
            <span className="hero-kicker">Teacher Recommendation System</span>
            <h1 className="hero-title">
              TRS Rebuild cho lớp lập trình hiện đại
            </h1>
            <p className="hero-desc">
              Cổng quản lý bài tập, nộp mã nguồn, chấm tự động và gợi ý testcase
              được làm lại với giao diện sáng, rõ thứ bậc và dễ dùng hơn.
            </p>

            <div className="hero-actions">
              <Link href="/login" className="btn btn-primary">
                Truy cập cổng đăng nhập
              </Link>
              <a href="#system-overview" className="btn btn-secondary">
                Xem trạng thái dịch vụ
              </a>
            </div>

            <div className="hero-stats" aria-label="Tổng quan hệ thống">
              <div className="hero-stat">
                <strong>3</strong>
                <span>vai trò và luồng học tập</span>
              </div>
              <div className="hero-stat">
                <strong>120+</strong>
                <span>testcase mẫu và ẩn</span>
              </div>
              <div className="hero-stat">
                <strong>24/7</strong>
                <span>chấm bài và phản hồi</span>
              </div>
            </div>
          </section>

          <aside className="portal-panel" aria-label="Lối vào nhanh">
            <div className="portal-panel-header">
              <div>
                <div className="portal-panel-title">Lối vào nhanh</div>
                <div className="portal-panel-subtitle">Chọn đúng vai trò sau khi đăng nhập.</div>
              </div>
              <span className="mock-badge primary">Ocean UI</span>
            </div>

            <div className="portal-stack">
              <div className="portal-row">
                <div className="portal-icon">GV</div>
                <div>
                  <strong>Giảng viên</strong>
                  <span>Tạo bài, import lớp, xem phản hồi testcase.</span>
                </div>
                <Link href="/login" className="btn btn-secondary">Mở</Link>
              </div>
              <div className="portal-row">
                <div className="portal-icon">SV</div>
                <div>
                  <strong>Sinh viên</strong>
                  <span>Nộp bài, xem kết quả chấm, nhận gợi ý sửa lỗi.</span>
                </div>
                <Link href="/login" className="btn btn-secondary">Mở</Link>
              </div>
              <div className="portal-row">
                <div className="portal-icon">API</div>
                <div>
                  <strong>Hạ tầng dịch vụ</strong>
                  <span>Frontend, Backend, Grader và PostgreSQL.</span>
                </div>
                <a href="#system-overview" className="btn btn-secondary">Xem</a>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <section id="system-overview" className="container" style={{ paddingBottom: "3rem" }}>
        <div className="tech-panel" style={{ marginTop: "0" }}>
          <h2 className="tech-panel-title">Trạng thái dịch vụ và cấu hình Docker</h2>
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
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <p>© 2026 TRS Rebuild. Thiết kế cho lớp lập trình và kiểm thử phần mềm.</p>
        </div>
      </footer>
    </>
  );
}
