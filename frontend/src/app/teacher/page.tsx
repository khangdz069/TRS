"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface Assignment {
  id: string;
  name: string;
  description: string;
  assignment_type?: AssignmentType;
  supported_languages?: string[];
  testcase_samples?: string;
  testcase_generation_strategy?: GenerationStrategy;
  testcase_seed_count?: number;
  generated_testcase_count?: number;
  problem_statement?: string;
  starter_code?: string;
  reference_solution?: string;
  type_config?: string;
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

interface ClassRoster {
  name: string;
  student_count: number;
  students: Student[];
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

type AssignmentType = "STANDARD" | "FILL_BLANK" | "DEBUGGING" | "PROJECT" | "QUIZ_CODE";
type GenerationStrategy = "MUTATION" | "BOUNDARY" | "RANDOMIZED" | "PAIRWISE";

const ASSIGNMENT_TYPES: Array<{ value: AssignmentType; label: string; hint: string }> = [
  { value: "STANDARD", label: "Bài thường", hint: "Nộp mã nguồn và chấm bằng testcase." },
  { value: "FILL_BLANK", label: "Bài đục lỗ", hint: "Sinh viên hoàn thiện đoạn code còn thiếu." },
  { value: "DEBUGGING", label: "Bài sửa lỗi", hint: "Cho code lỗi và yêu cầu sửa đúng." },
  { value: "PROJECT", label: "Mini project", hint: "Nhiều file, nhiều tiêu chí đánh giá." },
  { value: "QUIZ_CODE", label: "Trắc nghiệm code", hint: "Câu hỏi ngắn có kiểm thử tự động." },
];

const LANGUAGE_OPTIONS = [
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "java", label: "Java" },
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
];

const GENERATION_STRATEGIES: Array<{ value: GenerationStrategy; label: string; hint: string }> = [
  { value: "MUTATION", label: "Biến đổi tham số", hint: "Tăng giảm số và giữ cấu trúc testcase gốc." },
  { value: "BOUNDARY", label: "Biên dữ liệu", hint: "Tạo min, max, rỗng, âm, trùng lặp." },
  { value: "RANDOMIZED", label: "Ngẫu nhiên kiểm soát", hint: "Sinh biến thể ổn định từ testcase mẫu." },
  { value: "PAIRWISE", label: "Tổ hợp cặp", hint: "Kết hợp từng cặp tham số quan trọng." },
];

const countSeedTestcases = (value: string) =>
  value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length;

const mutateNumber = (raw: string, offset: number, strategy: GenerationStrategy) => {
  const value = Number(raw);
  if (!Number.isFinite(value)) return raw;
  if (strategy === "BOUNDARY") {
    const variants = [0, 1, -1, value * 2, Math.max(0, value - 1)];
    return String(variants[offset % variants.length]);
  }
  if (strategy === "PAIRWISE") return String(value + (offset % 3) - 1);
  if (strategy === "RANDOMIZED") return String(value + ((offset * 17) % 11) - 5);
  return String(value + offset + 1);
};

const generateTestcases = (samples: string, targetCount: number, strategy: GenerationStrategy) => {
  const seeds = samples.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (seeds.length === 0 || targetCount <= 0) return [];
  return Array.from({ length: targetCount }, (_, index) => {
    const seed = seeds[index % seeds.length];
    const mutated = seed.replace(/-?\d+(\.\d+)?/g, (match) => mutateNumber(match, index, strategy));
    return mutated === seed ? `${seed} # variant ${index + 1}` : mutated;
  });
};

const typeLabel = (value?: string) =>
  ASSIGNMENT_TYPES.find((item) => item.value === value)?.label || "Bài thường";

const strategyLabel = (value?: string) =>
  GENERATION_STRATEGIES.find((item) => item.value === value)?.label || "Biến đổi tham số";

const languageLabel = (values?: string[]) => {
  if (!values || values.length === 0) return "C++";
  return values.map((value) => LANGUAGE_OPTIONS.find((item) => item.value === value)?.label || value).join(", ");
};

const assignmentTypeGuide = (type: AssignmentType) => {
  if (type === "FILL_BLANK") {
    return "Giảng viên đưa code hoàn chỉnh hoặc template có đánh dấu HOLE. Hệ thống lưu bản chuẩn, bản starter và quy tắc đục lỗ để sinh bài cho sinh viên.";
  }
  if (type === "DEBUGGING") {
    return "Giảng viên đưa code lỗi, mô tả hành vi đúng và lời giải tham chiếu. Sinh viên nộp bản sửa, grader đối chiếu bằng testcase.";
  }
  if (type === "PROJECT") {
    return "Giảng viên đưa cấu trúc project, starter files, rubric và testcase smoke/integration. Sinh viên nộp nhiều file hoặc zip.";
  }
  if (type === "QUIZ_CODE") {
    return "Giảng viên đưa prompt ngắn, đáp án/giải thích chuẩn và testcase nhỏ nếu cần kiểm chứng.";
  }
  return "Giảng viên đưa đề bài, lời giải tham chiếu và testcase mẫu. Sinh viên nộp source để chấm tự động.";
};

const typeConfigLabel = (type: AssignmentType) => {
  if (type === "FILL_BLANK") return "Quy tắc đục lỗ";
  if (type === "DEBUGGING") return "Mô tả lỗi cần sửa";
  if (type === "PROJECT") return "Rubric / tiêu chí chấm";
  if (type === "QUIZ_CODE") return "Cấu hình câu hỏi";
  return "Cấu hình chấm";
};

const typeConfigPlaceholder = (type: AssignmentType) => {
  if (type === "FILL_BLANK") return "Ví dụ: auto_holes=3; preserve_imports=true; hoặc mô tả các vùng HOLE bắt buộc.";
  if (type === "DEBUGGING") return "Ví dụ: lỗi off-by-one ở biên phải; không đổi public API.";
  if (type === "PROJECT") return "Ví dụ: 60% testcase, 20% kiến trúc, 20% báo cáo.";
  if (type === "QUIZ_CODE") return "Ví dụ: single-choice, time_limit=10m, shuffle=false.";
  return "Ví dụ: time_limit=2s; memory=256MB; public_tests=10.";
};

export default function TeacherDashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const testcaseInputRef = useRef<HTMLInputElement>(null);
  const assignmentFileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TeacherTab>("assignments");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [user, setUser] = useState<TeacherUser | null>(null);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [classRosters, setClassRosters] = useState<ClassRoster[]>([]);
  const [classSection, setClassSection] = useState("");
  const [selectedClassName, setSelectedClassName] = useState("");
  const [coTeachers, setCoTeachers] = useState<string[]>([
    "lan.nt@hust.edu.vn",
    "hung.pv@hust.edu.vn",
  ]);

  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<AssignmentType>("STANDARD");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [starterCode, setStarterCode] = useState("");
  const [referenceSolution, setReferenceSolution] = useState("");
  const [typeConfig, setTypeConfig] = useState("");
  const [languages, setLanguages] = useState<string[]>(["cpp"]);
  const [generationStrategy, setGenerationStrategy] = useState<GenerationStrategy>("MUTATION");
  const [sampleTestcases, setSampleTestcases] = useState("1 2\n5 8\n10 20");
  const [generatedCount, setGeneratedCount] = useState(20);
  const [teacherEmail, setTeacherEmail] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");

  const [isLoadingAsms, setIsLoadingAsms] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const selectedAssignment = assignments.find((assignment) => assignment.id === selectedAssignmentId) || null;
  const seedCount = countSeedTestcases(sampleTestcases);
  const generatedPreview = generateTestcases(sampleTestcases, Math.min(generatedCount, 8), generationStrategy);

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
    if (selectedAssignmentId && (activeTab === "students" || activeTab === "import" || activeTab === "assignments")) {
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
        const rosters = data.class_rosters || [];
        setClassRosters(rosters);
        if (rosters.length > 0 && !rosters.some((roster: ClassRoster) => roster.name === selectedClassName)) {
          setSelectedClassName(rosters[0].name);
        }
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

  const resetAssignmentForm = () => {
    setNewTitle("");
    setNewType("STANDARD");
    setNewStart("");
    setNewEnd("");
    setNewDesc("");
    setProblemStatement("");
    setStarterCode("");
    setReferenceSolution("");
    setTypeConfig("");
    setLanguages(["cpp"]);
    setGenerationStrategy("MUTATION");
    setSampleTestcases("1 2\n5 8\n10 20");
    setGeneratedCount(20);
    setEditingAssignmentId(null);
    if (testcaseInputRef.current) testcaseInputRef.current.value = "";
  };

  const openCreateAssignment = () => {
    resetAssignmentForm();
    setIsModalOpen(true);
  };

  const openEditAssignment = (assignment: Assignment) => {
    setEditingAssignmentId(assignment.id);
    setNewTitle(assignment.name || "");
    setNewType(assignment.assignment_type || "STANDARD");
    setNewStart((assignment.start_date || "").slice(0, 10));
    setNewEnd((assignment.end_date || "").slice(0, 10));
    setNewDesc(assignment.description || "");
    setProblemStatement(assignment.problem_statement || "");
    setStarterCode(assignment.starter_code || "");
    setReferenceSolution(assignment.reference_solution || "");
    setTypeConfig(assignment.type_config || "");
    setLanguages(assignment.supported_languages?.length ? assignment.supported_languages : ["cpp"]);
    setGenerationStrategy(assignment.testcase_generation_strategy || "MUTATION");
    setSampleTestcases(assignment.testcase_samples || "");
    setGeneratedCount(assignment.generated_testcase_count || 0);
    setIsModalOpen(true);
  };

  const assignmentPayload = () => ({
    name: newTitle,
    description: newDesc,
    assignment_type: newType,
    supported_languages: languages.join(","),
    testcase_samples: sampleTestcases,
    testcase_generation_strategy: generationStrategy,
    testcase_seed_count: seedCount,
    generated_testcase_count: Math.max(0, generatedCount),
    problem_statement: problemStatement,
    starter_code: starterCode,
    reference_solution: referenceSolution,
    type_config: typeConfig,
    start_date: newStart,
    end_date: newEnd,
  });

  const handleAddAssignment = async (e: FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("trs_token");
    if (!token || !newTitle || !newStart || !newEnd) return;

    try {
      const response = await fetch(editingAssignmentId ? `/api/assignments/${editingAssignmentId}` : "/api/assignments", {
        method: editingAssignmentId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(assignmentPayload()),
      });

      if (!response.ok) {
        const errData = await response.json();
        alert(errData.error || "Không thể tạo bài tập lớn.");
        return;
      }

      resetAssignmentForm();
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

  const handleDeleteAssignment = async (assignmentId: string) => {
    const token = localStorage.getItem("trs_token");
    if (!token || !confirm("Xóa bài tập này khỏi danh sách quản lý?")) return;

    const response = await fetch(`/api/assignments/${assignmentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      alert(data.error || "Không thể xóa bài tập.");
      return;
    }
    if (selectedAssignmentId === assignmentId) setSelectedAssignmentId("");
    fetchAssignments(token);
  };

  const handleTestcaseFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSampleTestcases(await file.text());
  };

  const handleAssignmentFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    if (newType === "FILL_BLANK" || newType === "DEBUGGING" || newType === "PROJECT") {
      setStarterCode(content);
      if (!problemStatement.trim()) setProblemStatement(`File bài tập: ${file.name}`);
      return;
    }
    setProblemStatement(content);
  };

  const toggleLanguage = (value: string) => {
    setLanguages((current) => {
      if (current.includes(value)) {
        const next = current.filter((item) => item !== value);
        return next.length > 0 ? next : current;
      }
      return [...current, value];
    });
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
    formData.append("class_section", classSection.trim() || "Default");

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
            <button style={{ display: "none" }} className={`sidebar-link ${activeTab === "import" ? "active" : ""}`} onClick={() => setActiveTab("import")}>
              Đăng ký sinh viên
            </button>
            <button style={{ display: "none" }} className={`sidebar-link ${activeTab === "teachers" ? "active" : ""}`} onClick={() => setActiveTab("teachers")}>
              Thêm giảng viên hợp tác
            </button>
            <button style={{ display: "none" }} className={`sidebar-link ${activeTab === "students" ? "active" : ""}`} onClick={() => setActiveTab("students")}>
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
                <button className="btn btn-primary" onClick={openCreateAssignment}>
                  Thêm bài tập lớn
                </button>
              </div>

              <div className="teacher-metrics">
                <Metric label="Tổng bài" value={assignments.length} />
                <Metric label="Dạng bài" value={new Set(assignments.map((asm) => asm.assignment_type || "STANDARD")).size} />
                <Metric label="Ngôn ngữ" value={new Set(assignments.flatMap((asm) => asm.supported_languages || ["cpp"])).size} />
                <Metric label="TC sinh thêm" value={assignments.reduce((sum, asm) => sum + (asm.generated_testcase_count || 0), 0)} />
              </div>

              <div className="assignment-command-panel">
                <div>
                  <span className="eyebrow">Assignment Studio</span>
                  <h2>Luồng tạo bài mới</h2>
                  <p>Chọn dạng bài, ngôn ngữ hỗ trợ, import testcase mẫu và cấu hình bộ sinh testcase trước khi giao bài.</p>
                </div>
                {selectedAssignment && (
                  <div className="selected-assignment-summary">
                    <span>Đang chọn</span>
                    <strong>{selectedAssignment.name}</strong>
                    <small>{typeLabel(selectedAssignment.assignment_type)} · {languageLabel(selectedAssignment.supported_languages)}</small>
                  </div>
                )}
              </div>

              {selectedAssignment && (
                <div className="assignment-people-panel">
                  <div className="panel-title-row">
                    <div>
                      <h3>Quản lý lớp trong bài tập đang chọn</h3>
                      <p>Import sinh viên, thêm giảng viên hợp tác và xem danh sách sinh viên ngay trong cùng một giao diện.</p>
                    </div>
                    <span>{students.length} sinh viên</span>
                  </div>
                  <div className="assignment-people-grid">
                    <div className="people-tool">
                      <div className="form-group">
                        <label className="form-label">Tên lớp / nhóm</label>
                        <input
                          className="form-control"
                          value={classSection}
                          onChange={(e) => setClassSection(e.target.value)}
                          placeholder="VD: IT3180-01, K66-AI1, Nhóm 3"
                        />
                      </div>
                      <h4>Import sinh viên</h4>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        id="assignment-roster-file"
                        style={{ display: "none" }}
                      />
                      <label htmlFor="assignment-roster-file" className="upload-strip">
                        <strong>{selectedFile ? selectedFile.name : "Chọn file CSV/XLSX"}</strong>
                        <span>MSSV, Họ tên, Email</span>
                      </label>
                      <button className="btn btn-primary" onClick={handleCSVUpload} disabled={!selectedFile || isUploading}>
                        {isUploading ? "Đang xử lý..." : "Import"}
                      </button>
                    </div>
                    <div className="people-tool">
                      <h4>Giảng viên hợp tác</h4>
                      <form onSubmit={handleAddTeacher} className="compact-inline-form">
                        <input
                          type="email"
                          className="form-control"
                          placeholder="email@hust.edu.vn"
                          value={teacherEmail}
                          onChange={(e) => setTeacherEmail(e.target.value)}
                        />
                        <button type="submit" className="btn btn-secondary">Thêm</button>
                      </form>
                      <div className="teacher-chip-list">
                        <span>{user?.email} · chủ sở hữu</span>
                        {coTeachers.map((email) => <span key={email}>{email}</span>)}
                      </div>
                    </div>
                  </div>
                  {uploadMessage && <div className="notice success">{uploadMessage}</div>}
                  {uploadError && <div className="notice danger">{uploadError}</div>}
                  <div className="student-mini-table">
                    {isLoadingStudents && <p>Đang tải danh sách sinh viên...</p>}
                    {!isLoadingStudents && students.length === 0 && <p>Chưa có sinh viên trong bài tập này.</p>}
                    {!isLoadingStudents && classRosters.length > 0 && (
                      <div className="class-roster-tabs">
                        {classRosters.map((roster) => (
                          <button
                            key={roster.name}
                            className={selectedClassName === roster.name ? "active" : ""}
                            onClick={() => setSelectedClassName(roster.name)}
                          >
                            {roster.name} <span>{roster.student_count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {!isLoadingStudents && students.length > 0 && (
                      <table className="mock-table">
                        <thead>
                          <tr><th>MSSV</th><th>Họ tên</th><th>Email</th></tr>
                        </thead>
                        <tbody>
                          {(classRosters.find((roster) => roster.name === selectedClassName)?.students || students).slice(0, 12).map((student) => (
                            <tr key={student.id}>
                              <td>{student.mssv}</td>
                              <td>{student.name}</td>
                              <td>{student.email}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {isLoadingAsms && <p style={{ color: "hsl(var(--text-muted))" }}>Đang tải bài tập...</p>}
              {!isLoadingAsms && assignments.length === 0 && (
                <div className="tech-panel" style={{ textAlign: "center", padding: "3rem" }}>
                  <p style={{ color: "hsl(var(--text-muted))" }}>Chưa có bài tập lớn nào được tạo.</p>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {assignments.map((asm) => (
                  <div
                    key={asm.id}
                    className={`tech-panel assignment-card ${selectedAssignmentId === asm.id ? "selected" : ""}`}
                    style={{ marginTop: "0" }}
                    onClick={() => setSelectedAssignmentId(asm.id)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <div>
                        <span className="mock-badge primary">{typeLabel(asm.assignment_type)}</span>
                        <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "hsl(var(--color-primary))", marginTop: "0.65rem" }}>{asm.name}</h3>
                      </div>
                      <span className="mock-badge warning" style={{ fontFamily: "var(--font-mono)" }}>
                        Hạn nộp: {asm.end_date ? new Date(asm.end_date).toLocaleDateString("vi-VN") : "Không giới hạn"}
                      </span>
                    </div>
                    <p style={{ color: "hsl(var(--text-secondary))", fontSize: "0.95rem", marginBottom: "1rem" }}>{asm.description}</p>
                    <div className="assignment-meta-grid">
                      <Info label="Ngôn ngữ" value={languageLabel(asm.supported_languages)} />
                      <Info label="Testcase mẫu" value={`${asm.testcase_seed_count || 0} seed`} />
                      <Info label="Sinh thêm" value={`${asm.generated_testcase_count || 0} testcase`} />
                      <Info label="Chiến lược" value={strategyLabel(asm.testcase_generation_strategy)} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "hsl(var(--text-muted))", marginTop: "1rem" }}>
                      <span>Tạo bởi: {asm.author_name}</span>
                      <span>Mã ID: {asm.id.slice(0, 8)}</span>
                    </div>
                    <div className="assignment-actions" onClick={(event) => event.stopPropagation()}>
                      <button className="btn btn-secondary" onClick={() => openEditAssignment(asm)}>Sửa</button>
                      <button className="btn btn-danger" onClick={() => handleDeleteAssignment(asm.id)}>Xóa</button>
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
              <h3 className="modal-title">{editingAssignmentId ? "Sửa bài tập" : "Tạo bài tập lớn mới"}</h3>
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
                  <label className="form-label">Dạng bài</label>
                  <div className="assignment-type-grid">
                    {ASSIGNMENT_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        className={`assignment-type-option ${newType === type.value ? "selected" : ""}`}
                        onClick={() => setNewType(type.value)}
                      >
                        <strong>{type.label}</strong>
                        <span>{type.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Ngôn ngữ cho phép</label>
                  <div className="language-grid">
                    {LANGUAGE_OPTIONS.map((language) => (
                      <label key={language.value} className={`language-chip ${languages.includes(language.value) ? "selected" : ""}`}>
                        <input
                          type="checkbox"
                          checked={languages.includes(language.value)}
                          onChange={() => toggleLanguage(language.value)}
                        />
                        {language.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Import file bài tập</label>
                  <input
                    type="file"
                    ref={assignmentFileInputRef}
                    accept=".txt,.md,.cpp,.c,.h,.hpp,.java,.py,.js,.ts,.json,.zip"
                    onChange={handleAssignmentFileChange}
                  />
                  <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.85rem" }}>
                    Bài thường/quiz: file vào đề bài. Đục lỗ/sửa lỗi/project: file vào template hoặc starter code.
                  </p>
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
                <div className="assignment-logic-panel">
                  <div className="panel-title-row">
                    <div>
                      <h4>{typeLabel(newType)} cần dữ liệu gì?</h4>
                      <p>{assignmentTypeGuide(newType)}</p>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Đề bài hiển thị cho sinh viên</label>
                    <textarea
                      className="form-control"
                      value={problemStatement}
                      onChange={(e) => setProblemStatement(e.target.value)}
                      rows={4}
                      placeholder="Nhập đề bài, input/output, ràng buộc và yêu cầu nộp..."
                    />
                  </div>
                  {(newType === "FILL_BLANK" || newType === "DEBUGGING" || newType === "PROJECT") && (
                    <div className="form-group">
                      <label className="form-label">
                        {newType === "FILL_BLANK" ? "Bài hoàn chỉnh / template trước khi đục lỗ" : newType === "DEBUGGING" ? "Code lỗi giao cho sinh viên" : "Cấu trúc project / file starter"}
                      </label>
                      <textarea
                        className="form-control testcase-textarea"
                        value={starterCode}
                        onChange={(e) => setStarterCode(e.target.value)}
                        rows={7}
                        placeholder={newType === "FILL_BLANK" ? "Dán code hoàn chỉnh. Đánh dấu vùng có thể đục bằng /* HOLE:start */ ... /* HOLE:end */ nếu muốn tự kiểm soát." : "Dán starter code hoặc mô tả cây thư mục."}
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">
                      {newType === "QUIZ_CODE" ? "Đáp án / giải thích chuẩn" : "Lời giải tham chiếu"}
                    </label>
                    <textarea
                      className="form-control testcase-textarea"
                      value={referenceSolution}
                      onChange={(e) => setReferenceSolution(e.target.value)}
                      rows={6}
                      placeholder="Dùng để sinh/đối chiếu testcase và làm chuẩn chấm nội bộ."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{typeConfigLabel(newType)}</label>
                    <textarea
                      className="form-control"
                      value={typeConfig}
                      onChange={(e) => setTypeConfig(e.target.value)}
                      rows={3}
                      placeholder={typeConfigPlaceholder(newType)}
                    />
                  </div>
                </div>
                <div className="assignment-testcase-builder">
                  <div className="panel-title-row">
                    <div>
                      <h4>Testcase mẫu và bộ sinh testcase</h4>
                      <p>Import file mẫu hoặc dán mỗi testcase trên một dòng. Preview bên dưới cho thấy cách hệ thống sinh biến thể tương tự.</p>
                    </div>
                    <span>{seedCount} seed + {generatedCount} generated</span>
                  </div>
                  <div className="testcase-builder-grid">
                    <div>
                      <div className="form-group">
                        <label className="form-label">Chiến lược sinh</label>
                        <select
                          className="form-control"
                          value={generationStrategy}
                          onChange={(e) => setGenerationStrategy(e.target.value as GenerationStrategy)}
                        >
                          {GENERATION_STRATEGIES.map((strategy) => (
                            <option key={strategy.value} value={strategy.value}>
                              {strategy.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Số testcase sinh thêm</label>
                        <input
                          className="form-control"
                          type="number"
                          min={0}
                          max={500}
                          value={generatedCount}
                          onChange={(e) => setGeneratedCount(Number(e.target.value))}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Import testcase mẫu</label>
                        <input type="file" accept=".txt,.csv,.json" ref={testcaseInputRef} onChange={handleTestcaseFileChange} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Testcase mẫu</label>
                      <textarea
                        className="form-control testcase-textarea"
                        value={sampleTestcases}
                        onChange={(e) => setSampleTestcases(e.target.value)}
                        rows={8}
                      />
                    </div>
                  </div>
                  <div className="generated-preview">
                    <div className="panel-title-row">
                      <strong>Preview testcase sinh thêm</strong>
                      <span>{strategyLabel(generationStrategy)}</span>
                    </div>
                    <pre>{generatedPreview.join("\n") || "Thêm testcase mẫu để xem preview."}</pre>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingAssignmentId ? "Lưu thay đổi" : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-cell">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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
