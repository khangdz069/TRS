"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (role: "TEACHER" | "STUDENT") => {
    setError("");
    let targetEmail = email.trim();
    
    // Auto-fill test emails if user leaves input empty
    if (!targetEmail) {
      if (role === "TEACHER") {
        targetEmail = "teacher@hust.edu.vn";
      } else {
        targetEmail = "nam.tv231234@sis.hust.edu.vn";
      }
    } else {
      // Validate domain correctness case-insensitively
      const lowerEmail = targetEmail.toLowerCase();
      if (role === "TEACHER" && !lowerEmail.endsWith("@hust.edu.vn")) {
        setError("Email giảng viên phải kết thúc bằng @hust.edu.vn");
        return;
      }
      if (role === "STUDENT" && !lowerEmail.endsWith("@sis.hust.edu.vn")) {
        setError("Email sinh viên phải kết thúc bằng @sis.hust.edu.vn");
        return;
      }
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          name: name.trim() || undefined
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Đăng nhập thất bại");
      }

      const data = await response.json();
      localStorage.setItem("trs_token", data.token);
      localStorage.setItem("trs_user", JSON.stringify(data.account));
      if (data.student) localStorage.setItem("trs_student", JSON.stringify(data.student));
      if (data.teacher) localStorage.setItem("trs_teacher", JSON.stringify(data.teacher));

      if (data.account.role === "TEACHER") {
        router.push("/teacher");
      } else {
        router.push("/student");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong the ket noi den may chu.");
    } finally {
      setIsLoading(false);
    }
  };

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
            Authentication Gate
          </div>
        </div>
      </header>

      <main className="main container">
        <div className="login-card-wrapper">
          <div className="login-card">
            <div style={{ marginBottom: "1rem", fontSize: "3rem" }}>🔐</div>
            <h1 className="login-title">Đăng Nhập Hệ Thống</h1>
            <p className="login-subtitle">
              Nhập email và tên của bạn để giả lập xác thực Google OAuth 2.0.
            </p>

            {error && (
              <div style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "rgb(239, 68, 68)",
                padding: "0.75rem",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.85rem",
                marginBottom: "1rem",
                textAlign: "left"
              }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem", textAlign: "left" }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: "0.85rem" }}>Địa chỉ Email (Để trống sẽ tự động điền email test)</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Ví dụ: nam.tv231234@sis.hust.edu.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ background: "rgba(255,255,255,0.03)" }}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: "0.85rem" }}>Họ và Tên (Không bắt buộc)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: Trần Văn Nam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ background: "rgba(255,255,255,0.03)" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <button
                onClick={() => handleLogin("TEACHER")}
                disabled={isLoading}
                className="google-btn"
                style={{ cursor: "pointer", background: "none", width: "100%", textAlign: "left" }}
              >
                <svg className="google-icon" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.96 3.07C6.31 7.55 8.94 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.47h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.75-4.87 3.75-8.52z" />
                  <path fill="#FBBC05" d="M5.35 10.63c-.25-.75-.39-1.56-.39-2.38 0-.82.14-1.63.39-2.38L1.39 2.8C.5 4.57 0 6.57 0 8.75c0 2.18.5 4.18 1.39 5.95l3.96-3.07z" />
                  <path fill="#34A853" d="M12 15.96c-3.06 0-5.69-2.51-6.65-5.59L1.39 13.44C3.37 17.33 7.35 20 12 20c2.98 0 5.67-1.04 7.69-2.84l-3.66-2.84c-1.02.68-2.36 1.64-4.03 1.64z" />
                </svg>
                <span>{isLoading ? "Đang xử lý..." : "Đăng nhập Giảng viên (@hust.edu.vn)"}</span>
              </button>

              <button
                onClick={() => handleLogin("STUDENT")}
                disabled={isLoading}
                className="google-btn"
                style={{ cursor: "pointer", background: "none", width: "100%", textAlign: "left", borderColor: "hsl(var(--color-primary))" }}
              >
                <svg className="google-icon" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.96 3.07C6.31 7.55 8.94 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.47h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.75-4.87 3.75-8.52z" />
                  <path fill="#FBBC05" d="M5.35 10.63c-.25-.75-.39-1.56-.39-2.38 0-.82.14-1.63.39-2.38L1.39 2.8C.5 4.57 0 6.57 0 8.75c0 2.18.5 4.18 1.39 5.95l3.96-3.07z" />
                  <path fill="#34A853" d="M12 15.96c-3.06 0-5.69-2.51-6.65-5.59L1.39 13.44C3.37 17.33 7.35 20 12 20c2.98 0 5.67-1.04 7.69-2.84l-3.66-2.84c-1.02.68-2.36 1.64-4.03 1.64z" />
                </svg>
                <span>{isLoading ? "Đang xử lý..." : "Đăng nhập Sinh viên (@sis.hust.edu.vn)"}</span>
              </button>
            </div>

            <div className="login-footer-info">
              Hệ thống sử dụng cổng xác thực giả lập dev-auth phục vụ phát triển phần mềm TRS Rebuild.
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <p>© 2026 TRS Rebuild. Cổng xác thực giả lập.</p>
        </div>
      </footer>
    </>
  );
}
