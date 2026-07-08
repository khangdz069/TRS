"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface LoginResponse {
  token?: string;
  account?: {
    role?: "TEACHER" | "STUDENT";
    [key: string]: unknown;
  };
  student?: unknown;
  teacher?: unknown;
  error?: string;
}

const readApiResponse = async (response: Response): Promise<LoginResponse> => {
  const rawText = await response.text();
  if (!rawText) return {};

  try {
    return JSON.parse(rawText) as LoginResponse;
  } catch {
    return { error: rawText };
  }
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (role: "TEACHER" | "STUDENT") => {
    setError("");
    let targetEmail = email.trim();

    if (!targetEmail) {
      targetEmail = role === "TEACHER"
        ? "teacher@hust.edu.vn"
        : "nam.tv20231234@sis.hust.edu.vn";
    } else {
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
          name: name.trim() || undefined,
        }),
      });

      const data = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(data.error || `Đăng nhập thất bại. Mã lỗi HTTP ${response.status}.`);
      }
      if (!data.token || !data.account?.role) {
        throw new Error("Máy chủ trả về dữ liệu đăng nhập không đầy đủ.");
      }

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
      setError(err instanceof Error ? err.message : "Không thể kết nối đến máy chủ.");
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
          <section className="login-visual" aria-label="Không gian học tập TRS">
            <div className="login-visual-panel">
              <strong>Learning workflow, cleaned up.</strong>
              <span>Giảng viên và sinh viên dùng chung một cổng, hệ thống tự chuyển đúng dashboard sau xác thực.</span>
            </div>
          </section>

          <section className="login-card">
            <div className="login-mark">TRS</div>
            <h1 className="login-title">Đăng nhập hệ thống</h1>
            <p className="login-subtitle">
              Nhập email và tên để giả lập xác thực Google OAuth 2.0 trong môi trường phát triển.
            </p>

            {error && (
              <div className="notice danger" style={{ marginBottom: "1rem", marginTop: "0" }}>
                Cảnh báo: {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1.35rem" }}>
              <div className="form-group">
                <label className="form-label">
                  Địa chỉ email, để trống sẽ tự điền email test
                </label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Ví dụ: nam.tv20231234@sis.hust.edu.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Họ và tên, không bắt buộc
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: Trần Văn Nam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <button
                onClick={() => handleLogin("TEACHER")}
                disabled={isLoading}
                className="google-btn"
                type="button"
              >
                <svg className="google-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.96 3.07C6.31 7.55 8.94 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.47h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.75-4.87 3.75-8.52z" />
                  <path fill="#FBBC05" d="M5.35 10.63c-.25-.75-.39-1.56-.39-2.38 0-.82.14-1.63.39-2.38L1.39 2.8C.5 4.57 0 6.57 0 8.75c0 2.18.5 4.18 1.39 5.95l3.96-3.07z" />
                  <path fill="#34A853" d="M12 15.96c-3.06 0-5.69-2.51-6.65-5.59L1.39 13.44C3.37 17.33 7.35 20 12 20c2.98 0 5.67-1.04 7.69-2.84l-3.66-2.84c-1.02.68-2.36 1.64-4.03 1.64z" />
                </svg>
                <span>{isLoading ? "Đang xử lý..." : "Đăng nhập giảng viên (@hust.edu.vn)"}</span>
              </button>

              <button
                onClick={() => handleLogin("STUDENT")}
                disabled={isLoading}
                className="google-btn"
                type="button"
              >
                <svg className="google-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.96 3.07C6.31 7.55 8.94 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.47h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.75-4.87 3.75-8.52z" />
                  <path fill="#FBBC05" d="M5.35 10.63c-.25-.75-.39-1.56-.39-2.38 0-.82.14-1.63.39-2.38L1.39 2.8C.5 4.57 0 6.57 0 8.75c0 2.18.5 4.18 1.39 5.95l3.96-3.07z" />
                  <path fill="#34A853" d="M12 15.96c-3.06 0-5.69-2.51-6.65-5.59L1.39 13.44C3.37 17.33 7.35 20 12 20c2.98 0 5.67-1.04 7.69-2.84l-3.66-2.84c-1.02.68-2.36 1.64-4.03 1.64z" />
                </svg>
                <span>{isLoading ? "Đang xử lý..." : "Đăng nhập sinh viên (@sis.hust.edu.vn)"}</span>
              </button>
            </div>

            <div className="login-footer-info">
              Hệ thống dùng cổng xác thực giả lập phục vụ phát triển phần mềm TRS Rebuild.
            </div>
          </section>
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
