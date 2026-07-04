"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface Assignment {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  author_name: string;
}

interface Student {
  id: string;
  mssv: string;
  name: string;
  email: string;
}

interface TeacherUser {
  id: string;
  name: string;
  email: string;
  role: "TEACHER";
}

interface FeedbackEntry {
  rating: number;
  text: string;
  created_at?: string | null;
}

interface AnalyticsData {
  total: number;
  average_rating: number;
  testcase_stats: Record<string, number>;
  feedbacks: FeedbackEntry[];
}

type TeacherTab = "assignments" | "import" | "teachers" | "students" | "analytics";

export default function TeacherDashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TeacherTab>("assignments");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState<TeacherUser | null>(null);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [coTeachers, setCoTeachers] = useState<string[]>([
    "lan.nt@hust.edu.vn",
    "hung.pv@hust.edu.vn",
  ]);

  const [newTitle, setNewTitle] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");

  const [isLoadingAsms, setIsLoadingAsms] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("trs_token");
    const storedUser = localStorage.getItem("trs_user");
    if (!token || !storedUser) {
      router.push("/login");
      return;
    }

    const parsedUser = JSON.parse(storedUser) as TeacherUser;
    if (parsedUser.role !== "TEACHER") {
      router.push("/student");
      return;
    }

    setUser(parsedUser);
    fetchAssignments(token);
  }, []);

  useEffect(() => {
    if (selectedAssignmentId && (activeTab === "students" || activeTab === "import")) {
      fetchStudents(selectedAssignmentId);
    }
    if (selectedAssignmentId && activeTab === "analytics") {
      fetchAnalytics(selectedAssignmentId);
    }
  }, [selectedAssignmentId, activeTab]);

  const fetchAssignments = async (token?: string) => {
    const activeToken = token || localStorage.getItem("trs_token");
    if (!activeToken) return;

    setIsLoadingAsms(true);
    try {
      const response = await fetch("/api/assignments", {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAssignments(data);
        if (data.length > 0 && !selectedAssignmentId) {
          setSelectedAssignmentId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch assignments", err);
    } finally {
      setIsLoadingAsms(false);
    }
  };

  const fetchStudents = async (asmId: string) => {
    const token = localStorage.getItem("trs_token");
    if (!token || !asmId) return;

    setIsLoadingStudents(true);
    try {
      const response = await fetch(`/api/assignments/${asmId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data.student_list || []);
      }
    } catch (err) {
      console.error("Failed to fetch students roster", err);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const fetchAnalytics = async (asmId: string) => {
    const token = localStorage.getItem("trs_token");
    if (!token || !asmId) return;

    setIsLoadingAnalytics(true);
    try {
      const response = await fetch(`/api/forms/analytics?assignment_id=${asmId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const handleAddAssignment = async (e: FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("trs_token");
    if (!token || !newTitle || !newStart || !newEnd) return;

    try {
      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newTitle,
          description: newDesc,
          start_date: newStart,
          end_date: newEnd,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        alert(errData.error || "Không thể tạo bài tập lớn.");
        return;
      }

      setNewTitle("");
      setNewStart("");
      setNewEnd("");
      setNewDesc("");
      setIsModalOpen(false);
      fetchAssignments(token);
    } catch (err) {
      console.error("Error creating assignment", err);
      alert("Lỗi kết nối máy chủ khi tạo bài tập.");
    }
  };

  const handleAddTeacher = (e: FormEvent) => {
    e.preventDefault();
    const email = teacherEmail.trim();
    if (!email || coTeachers.includes(email)) return;
    setCoTeachers([...coTeachers, email]);
    setTeacherEmail("");
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadMessage("");
      setUploadError("");
    }
  };

  const handleCSVUpload = async () => {
    const token = localStorage.getItem("trs_token");
    if (!token || !selectedFile || !selectedAssignmentId) return;

    setIsUploading(true);
    setUploadMessage("");
    setUploadError("");

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("assignment_id", selectedAssignmentId);

    try {
      const response = await fetch("/api/students/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setUploadMessage(`Thành công: ${data.message}`);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchStudents(selectedAssignmentId);
      } else {
        setUploadError(data.error || "Tải lên thất bại.");
      }
    } catch {
      setUploadError("Lỗi kết nối máy chủ khi tải lên danh sách sinh viên.");
    } finally {
      setIsUploading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    router.push("/login");
  };

  return (
    <>
      <div className="bg-glow-mesh"></div>

      <header className="header">
        <div className="container header-container">
          <Link href="/" className="logo">
            TRS <span className="logo-badge">Rebuild</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.9rem", color: "hsl(var(--text-secondary))" }}>
              Chào giảng viên: <strong>{user?.name || "Teacher"}</strong>
            </span>
            <button onClick={logout} className="sys-status" style={{ background: "rgba(239, 68, 68, 0.1)", color: "rgb(239, 68, 68)", borderColor: "rgba(239, 68, 68, 0.2)", textDecoration: "none", cursor: "pointer" }}>
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <div className="sidebar-layout">
        <aside className="sidebar">
          <div className="sidebar-title">Menu quản lý</div>
          <nav className="sidebar-nav">
            <button className={`sidebar-link ${activeTab === "assignments" ? "active" : ""}`} onClick={() => setActiveTab("assignments")}>
              Quản lý bài tập lớn
            </button>
            <button className={`sidebar-link ${activeTab === "import" ? "active" : ""}`} onClick={() => setActiveTab("import")}>
              Đăng ký sinh viên
            </button>
            <button className={`sidebar-link ${activeTab === "teachers" ? "active" : ""}`} onClick={() => setActiveTab("teachers")}>
              Thêm giảng viên hợp tác
            </button>
            <button className={`sidebar-link ${activeTab === "students" ? "active" : ""}`} onClick={() => setActiveTab("students")}>
              Danh sách sinh viên
            </button>
            <button className={`sidebar-link ${activeTab === "analytics" ? "active" : ""}`} onClick={() => setActiveTab("analytics")}>
              Thống kê survey
            </button>
          </nav>
        </aside>

        <main className="content-area">
          {activeTab === "assignments" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <div>
                  <h1 style={{ fontSize: "1.75rem", fontWeight: 800 }}>Quản lý bài tập lớn</h1>
                  <p style={{ color: "hsl(var(--text-secondary))" }}>Tạo mới, xem và chỉnh sửa các bài tập lớn lập trình trên hệ thống.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                  Thêm bài tập lớn
                </button>
              </div>

              {isLoadingAsms && <p style={{ color: "hsl(var(--text-muted))" }}>Đang tải bài tập lớn...</p>}
              {!isLoadingAsms && assignments.length === 0 && (
                <div className="tech-panel" style={{ textAlign: "center", padding: "3rem" }}>
                  <p style={{ color: "hsl(var(--text-muted))" }}>Chưa có bài tập lớn nào được tạo.</p>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {assignments.map((asm) => (
                  <div key={asm.id} className="tech-panel" style={{ marginTop: "0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "hsl(var(--color-primary))" }}>{asm.name}</h3>
                      <span className="mock-badge warning" style={{ fontFamily: "var(--font-mono)" }}>
                        Hạn nộp: {asm.end_date ? new Date(asm.end_date).toLocaleString("vi-VN") : "Không giới hạn"}
                      </span>
                    </div>
                    <p style={{ color: "hsl(var(--text-secondary))", fontSize: "0.95rem", marginBottom: "1rem" }}>{asm.description}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "hsl(var(--text-muted))" }}>
                      <span>Tạo bởi: {asm.author_name}</span>
                      <span>Mã ID: {asm.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "import" && (
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>Đăng ký sinh viên bằng CSV/Excel</h1>
              <p style={{ color: "hsl(var(--text-secondary))", marginBottom: "2.5rem" }}>
                Tải lên tệp CSV hoặc Excel chứa danh sách lớp để đăng ký sinh viên vào một bài tập lớn cụ thể.
              </p>

              <div className="tech-panel" style={{ marginBottom: "2rem" }}>
                <div className="form-group" style={{ maxWidth: "400px" }}>
                  <label className="form-label">Chọn bài tập lớn đích</label>
                  <select
                    className="form-control"
                    value={selectedAssignmentId}
                    onChange={(e) => setSelectedAssignmentId(e.target.value)}
                    style={{ background: "rgba(0,0,0,0.2)" }}
                  >
                    {assignments.map((asm) => (
                      <option key={asm.id} value={asm.id} style={{ background: "#222" }}>{asm.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="tech-panel" style={{ marginBottom: "2rem", borderLeft: "4px solid hsl(var(--color-secondary))" }}>
                <h4 style={{ fontWeight: "700", marginBottom: "0.5rem" }}>Định dạng file yêu cầu</h4>
                <p style={{ fontSize: "0.9rem", color: "hsl(var(--text-secondary))" }}>
                  File CSV hoặc Excel nên có các cột tiêu đề tương ứng: <code>MSSV</code>, <code>Họ tên</code>, và <code>Email</code>.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div style={{
                  border: "2px dashed hsl(var(--border-color))",
                  padding: "2rem",
                  borderRadius: "var(--radius-md)",
                  textAlign: "center",
                  background: "rgba(255,255,255,0.01)",
                }}>
                  <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem", fontWeight: 700 }}>CSV / XLSX</div>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    id="csv-file-picker"
                  />
                  <label htmlFor="csv-file-picker" className="btn btn-secondary" style={{ cursor: "pointer", display: "inline-block", marginBottom: "0.5rem" }}>
                    Chọn tệp tin
                  </label>
                  <div style={{ fontSize: "0.9rem", color: "hsl(var(--text-muted))" }}>
                    {selectedFile ? `Tệp đã chọn: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)` : "Chọn file CSV hoặc Excel của BKEL (.csv, .xlsx)"}
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleCSVUpload}
                  disabled={!selectedFile || isUploading || !selectedAssignmentId}
                  style={{ alignSelf: "flex-start" }}
                >
                  {isUploading ? "Đang xử lý..." : "Tải lên và xử lý"}
                </button>
              </div>

              {uploadMessage && (
                <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "var(--radius-sm)", color: "hsl(var(--color-success))" }}>
                  {uploadMessage}
                </div>
              )}

              {uploadError && (
                <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--radius-sm)", color: "rgb(239, 68, 68)" }}>
                  Cảnh báo: {uploadError}
                </div>
              )}
            </div>
          )}

          {activeTab === "teachers" && (
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>Thêm giảng viên hợp tác</h1>
              <p style={{ color: "hsl(var(--text-secondary))", marginBottom: "2rem" }}>
                Cấp quyền cho giảng viên khác tham gia quản lý, chấm điểm và chỉnh sửa bài tập lớn.
              </p>

              <form onSubmit={handleAddTeacher} style={{ display: "flex", gap: "1rem", marginBottom: "2rem", maxWidth: "500px" }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Nhập email giảng viên (@hust.edu.vn)"
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Thêm
                </button>
              </form>

              <div className="tech-panel" style={{ marginTop: "0" }}>
                <h3 className="tech-panel-title">Giảng viên tham gia quản lý</h3>
                <ul style={{ listStyleType: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <li style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.5rem", borderBottom: "1px solid hsl(var(--border-color))" }}>
                    <span>{user?.email} (Bạn - chủ sở hữu)</span>
                    <span className="mock-badge success">Chủ sở hữu</span>
                  </li>
                  {coTeachers.map((email) => (
                    <li key={email} style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.5rem", borderBottom: "1px solid hsl(var(--border-color))" }}>
                      <span>{email}</span>
                      <span className="mock-badge primary" style={{ cursor: "pointer" }} onClick={() => setCoTeachers(coTeachers.filter((item) => item !== email))}>
                        Xóa
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === "students" && (
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>Danh sách sinh viên tham gia</h1>
              <p style={{ color: "hsl(var(--text-secondary))", marginBottom: "2rem" }}>
                Xem danh sách sinh viên được phân bổ và cấp quyền nộp bài tại các bài tập lớn.
              </p>

              <AssignmentPicker assignments={assignments} selectedAssignmentId={selectedAssignmentId} setSelectedAssignmentId={setSelectedAssignmentId} />

              {isLoadingStudents && <p style={{ color: "hsl(var(--text-muted))" }}>Đang tải danh sách sinh viên...</p>}
              {!isLoadingStudents && students.length === 0 && selectedAssignmentId && (
                <div className="tech-panel" style={{ textAlign: "center", padding: "2rem" }}>
                  <p style={{ color: "hsl(var(--text-muted))" }}>Chưa có sinh viên nào đăng ký vào bài tập này. Hãy import từ tab CSV.</p>
                </div>
              )}

              {!isLoadingStudents && students.length > 0 && (
                <table className="mock-table">
                  <thead>
                    <tr>
                      <th>MSSV</th>
                      <th>Họ và tên</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id}>
                        <td style={{ fontFamily: "var(--font-mono)" }}>{student.mssv}</td>
                        <td style={{ fontWeight: "600" }}>{student.name}</td>
                        <td>{student.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "analytics" && (
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>Thống kê khảo sát</h1>
              <p style={{ color: "hsl(var(--text-secondary))", marginBottom: "2rem" }}>
                Thống kê các đánh giá phản hồi gợi ý testcase từ sinh viên cho bài tập lớn.
              </p>

              <AssignmentPicker assignments={assignments} selectedAssignmentId={selectedAssignmentId} setSelectedAssignmentId={setSelectedAssignmentId} />

              {isLoadingAnalytics && <p style={{ color: "hsl(var(--text-muted))" }}>Đang tải dữ liệu thống kê...</p>}
              {!isLoadingAnalytics && analyticsData && (
                <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                    <div className="tech-panel" style={{ marginTop: "0", textAlign: "center" }}>
                      <h3 style={{ color: "hsl(var(--text-secondary))", fontSize: "1rem", marginBottom: "0.5rem" }}>Tổng số lượt feedback</h3>
                      <div style={{ fontSize: "2.5rem", fontWeight: "800", color: "hsl(var(--color-primary))" }}>
                        {analyticsData.total}
                      </div>
                    </div>
                    <div className="tech-panel" style={{ marginTop: "0", textAlign: "center" }}>
                      <h3 style={{ color: "hsl(var(--text-secondary))", fontSize: "1rem", marginBottom: "0.5rem" }}>Đánh giá trung bình</h3>
                      <div style={{ fontSize: "2.5rem", fontWeight: "800", color: "hsl(var(--color-success))" }}>
                        {analyticsData.average_rating.toFixed(1)} sao
                      </div>
                    </div>
                  </div>

                  {analyticsData.total > 0 && (
                    <div className="tech-panel" style={{ marginTop: "0" }}>
                      <h3 className="tech-panel-title">Các testcase được gợi ý nhiều nhất</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {Object.entries(analyticsData.testcase_stats)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 10)
                          .map(([tcId, count]) => (
                            <div key={tcId} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                              <div style={{ width: "80px", fontFamily: "var(--font-mono)" }}>Test {tcId}</div>
                              <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", height: "12px", borderRadius: "6px", overflow: "hidden" }}>
                                <div style={{ width: `${(count / analyticsData.total) * 100}%`, height: "100%", background: "hsl(var(--color-primary))" }}></div>
                              </div>
                              <div style={{ width: "40px", textAlign: "right" }}>{count}</div>
                            </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analyticsData.feedbacks && analyticsData.feedbacks.length > 0 && (
                    <div className="tech-panel" style={{ marginTop: "0" }}>
                      <h3 className="tech-panel-title">Các phản hồi ý kiến gần đây</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {analyticsData.feedbacks.map((feedback, idx) => (
                          <div key={`${feedback.created_at || idx}`} style={{ padding: "1rem", background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid hsl(var(--color-primary))" }}>
                            <div style={{ marginBottom: "0.5rem" }}>
                              <span>{feedback.rating}/5 sao</span>
                              <span style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))", marginLeft: "1rem" }}>
                                {feedback.created_at ? new Date(feedback.created_at).toLocaleString("vi-VN") : ""}
                              </span>
                            </div>
                            <p style={{ color: "hsl(var(--text-primary))", margin: 0, fontStyle: "italic" }}>&quot;{feedback.text}&quot;</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">Tạo bài tập lớn mới</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddAssignment}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tên bài tập lớn</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nhập tên bài tập..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày bắt đầu</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hạn nộp bài</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mô tả bài tập</label>
                  <textarea
                    className="form-control"
                    placeholder="Mô tả các yêu cầu và đầu ra cần có..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Tạo mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function AssignmentPicker({
  assignments,
  selectedAssignmentId,
  setSelectedAssignmentId,
}: {
  assignments: Assignment[];
  selectedAssignmentId: string;
  setSelectedAssignmentId: (id: string) => void;
}) {
  return (
    <div className="tech-panel" style={{ marginBottom: "2rem" }}>
      <div className="form-group" style={{ maxWidth: "400px" }}>
        <label className="form-label">Chọn bài tập lớn</label>
        <select
          className="form-control"
          value={selectedAssignmentId}
          onChange={(e) => setSelectedAssignmentId(e.target.value)}
          style={{ background: "rgba(0,0,0,0.2)" }}
        >
          <option value="" disabled>-- Chọn bài tập lớn --</option>
          {assignments.map((assignment) => (
            <option key={assignment.id} value={assignment.id} style={{ background: "#222" }}>
              {assignment.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
