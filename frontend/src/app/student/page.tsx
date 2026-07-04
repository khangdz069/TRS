"use client";

import Link from "next/link";
import { useState, useEffect, useRef, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

interface Assignment {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  author_name: string;
}

interface Submission {
  id: string;
  status: string;
  scores: Record<string, boolean> | boolean[] | string | null;
  failed_outputs?: Record<string, {
    expected?: string | null;
    actual?: string | null;
    error?: string | null;
  }> | null;
  compile_error: string | null;
  runtime_error: string | null;
  created_at: string;
}

interface RecommendationDetail {
  id: number;
  input: string;
  parameters?: string;
  output?: string;
  expected_output: string;
  your_output: string;
  real_output?: string;
  passed?: boolean;
  status: string;
}

interface Recommendation {
  id: string;
  status: string;
  recommended_testcases: number[];
  failed_testcases: number[];
  is_filled_form: boolean;
  details?: RecommendationDetail[];
}

interface ScoreEntry {
  id: number;
  passed: boolean;
}

interface TestcaseTableRow {
  id: number;
  parameters: string;
  output: string;
  expected_output: string;
  real_output: string;
  passed: boolean;
  status: string;
}

interface EncodedSubmissionFile {
  filename: string;
  content: string;
  encoding: "base64";
}

const PUBLIC_TESTCASE_COUNT = 10;
const TESTCASE_IDS = [
  ...Array.from({ length: 10 }, (_, index) => 1001 + index),
  ...Array.from({ length: 6 }, (_, index) => 1011 + index),
  ...Array.from({ length: 10 }, (_, index) => 1021 + index),
  ...Array.from({ length: 14 }, (_, index) => 1047 + index),
  ...Array.from({ length: 18 }, (_, index) => 1075 + index),
  ...Array.from({ length: 8 }, (_, index) => 1111 + index),
  ...Array.from({ length: 6 }, (_, index) => 1125 + index),
  ...Array.from({ length: 10 }, (_, index) => 1141 + index),
  ...Array.from({ length: 6 }, (_, index) => 1155 + index),
  ...Array.from({ length: 5 }, (_, index) => 1171 + index),
  ...Array.from({ length: 8 }, (_, index) => 1181 + index),
  ...Array.from({ length: 8 }, (_, index) => 1201 + index),
];

const normalizeScores = (scores: Submission["scores"]): ScoreEntry[] => {
  if (!scores) return [];

  if (typeof scores === "string") {
    try {
      return normalizeScores(JSON.parse(scores));
    } catch {
      return [];
    }
  }

  if (Array.isArray(scores)) {
    return scores.map((passed, index) => ({
      id: TESTCASE_IDS[index] ?? index + 1,
      passed: Boolean(passed),
    }));
  }

  return Object.entries(scores)
    .map(([id, passed]) => ({ id: Number(id), passed: Boolean(passed) }))
    .filter((score) => Number.isFinite(score.id))
    .sort((a, b) => a.id - b.id);
};

const getTestcaseMetadata = (tcId: number) => {
  const runArg = tcId - 1000;
  const metadata = {
    parameters: `argv[1]=${runArg}`,
    output: "stdout của chương trình",
  };

  const sizes = [10, 50, 100, -1];

  if (tcId >= 1181 && tcId <= 1200) {
    const groups = [2, 3, 5, 10, 20];
    const offset = tcId - 1181;
    const k = groups[Math.floor(offset / 4)];
    const sizeX = sizes[offset % 4];
    metadata.parameters = `argv[1]=${runArg}; k=${k}; size_X=${sizeX}; test_size=0.2; dataset=mnist.csv`;
    metadata.output = "y_pred và y_test từ kNN.predict";
  }

  if (tcId >= 1201 && tcId <= 1220) {
    const groups = [5, 10, 20, 2, 3];
    const offset = tcId - 1201;
    const k = groups[Math.floor(offset / 4)];
    const sizeX = sizes[offset % 4];
    metadata.parameters = `argv[1]=${runArg}; k=${k}; size_X=${sizeX}; test_size=0.2; dataset=mnist.csv`;
    metadata.output = "Accuracy từ kNN.score";
  }

  return metadata;
};

const buildTestcaseRow = (
  tcId: number,
  passed: boolean,
  failedOutputs?: Submission["failed_outputs"],
): TestcaseTableRow => {
  const metadata = getTestcaseMetadata(tcId);
  const failedOutput = failedOutputs?.[String(tcId)];

  return {
    id: tcId,
    parameters: metadata.parameters,
    output: metadata.output,
    expected_output: failedOutput?.expected || (passed ? "Khớp" : "N/A"),
    real_output: failedOutput?.actual || failedOutput?.error || (passed ? "Khớp" : "N/A"),
    passed,
    status: passed ? "Đúng" : "Sai",
  };
};

const readFileAsBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = String(reader.result || "");
    resolve(result.includes(",") ? result.split(",")[1] : result);
  };
  reader.onerror = () => reject(reader.error || new Error(`Không đọc được file ${file.name}`));
  reader.readAsDataURL(file);
});

export default function StudentDashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"assignments" | "submit" | "history">("assignments");
  
  // Data States
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAsm, setSelectedAsm] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  
  // Code Editor states
  const [editorFile, setEditorFile] = useState("solution.cpp");
  const [editorContent, setEditorContent] = useState(
    '#include "kNN.hpp"\n\n// Viết mã nguồn giải bài tập C++ của bạn ở đây.\n'
  );
  
  // Drag & Drop States
  const [solutionFiles, setSolutionFiles] = useState<File[]>([]);
  const [encodedSolutionFiles, setEncodedSolutionFiles] = useState<EncodedSubmissionFile[]>([]);
  const [isEncodingFiles, setIsEncodingFiles] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Feedback Form states
  const [formRating, setFormRating] = useState<number>(5);
  const [formFeedback, setFormFeedback] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);

  // loading states
  const [isLoadingAsms, setIsLoadingAsms] = useState(false);
  const [isLoadingSubs, setIsLoadingSubs] = useState(false);
  const [studentName, setStudentName] = useState("Sinh viên");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Auth Check
    const token = typeof window !== "undefined" ? localStorage.getItem("trs_token") : null;
    const user = typeof window !== "undefined" ? localStorage.getItem("trs_user") : null;
    if (!token || !user) {
      router.push("/login");
      return;
    }
    const parsedUser = JSON.parse(user);
    if (parsedUser.role !== "STUDENT") {
      router.push("/teacher");
      return;
    }
    setStudentName(parsedUser.name || "Sinh viên");
    fetchAssignments(token);
  }, []);

  const fetchAssignments = async (token: string) => {
    setIsLoadingAsms(true);
    try {
      const response = await fetch("/api/assignments", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAssignments(data);
        if (data.length > 0) {
          setSelectedAsm(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch assignments", err);
    } finally {
      setIsLoadingAsms(false);
    }
  };

  const fetchSubmissions = async (asmId: string) => {
    const token = localStorage.getItem("trs_token");
    if (!token || !asmId) return;

    setIsLoadingSubs(true);
    try {
      const response = await fetch(`/api/submissions?assignment_id=${asmId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
        if (data.length > 0) {
          // Select newest submission
          setSelectedSubmission(data[0]);
        } else {
          setSelectedSubmission(null);
          setRecommendation(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch submissions", err);
    } finally {
      setIsLoadingSubs(false);
    }
  };

  const fetchRecommendation = async (subId: string) => {
    const token = localStorage.getItem("trs_token");
    if (!token || !subId) return;

    try {
      const response = await fetch(`/api/testcases?submission_id=${subId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRecommendation(data);
      } else {
        setRecommendation(null);
      }
    } catch (err) {
      console.error("Failed to fetch recommendation", err);
      setRecommendation(null);
    }
  };

  useEffect(() => {
    if (selectedAsm) {
      fetchSubmissions(selectedAsm.id);
    }
  }, [selectedAsm]);

  useEffect(() => {
    if (selectedSubmission) {
      fetchRecommendation(selectedSubmission.id);
      setFormSubmitted(selectedSubmission.status === 'SUCCESS' ? false : true); // Reset feedback states
      setFormFeedback("");
    }
  }, [selectedSubmission]);

  // Polling for async grading
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (selectedSubmission && (selectedSubmission.status === 'PENDING' || selectedSubmission.status === 'GRADING')) {
      intervalId = setInterval(() => {
        if (selectedAsm) {
          fetchSubmissions(selectedAsm.id);
        }
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [selectedSubmission, selectedAsm]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const cacheSelectedFiles = async (files: File[]) => {
    setSubmitError("");
    setSubmitSuccess(false);
    setIsEncodingFiles(true);

    try {
      const encodedFiles = await Promise.all(files.map(async (file) => ({
        filename: file.name,
        content: await readFileAsBase64(file),
        encoding: "base64" as const,
      })));
      setSolutionFiles((previousFiles) => {
        const merged = new Map(previousFiles.map((file) => [file.name, file]));
        files.forEach((file) => merged.set(file.name, file));
        return Array.from(merged.values());
      });
      setEncodedSolutionFiles((previousFiles) => {
        const merged = new Map(previousFiles.map((file) => [file.filename, file]));
        encodedFiles.forEach((file) => merged.set(file.filename, file));
        return Array.from(merged.values());
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không rõ nguyên nhân";
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSubmitError(`Không đọc được file vừa chọn: ${message}. Hãy chọn lại file từ thư mục project/examples/demo_submissions.`);
    } finally {
      setIsEncodingFiles(false);
    }
  };

  const clearSelectedFiles = () => {
    setSolutionFiles([]);
    setEncodedSolutionFiles([]);
    setSubmitError("");
    setSubmitSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await cacheSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await cacheSelectedFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleSubmitSolution = async (mode: "editor" | "file") => {
    const token = localStorage.getItem("trs_token");
    if (!token || !selectedAsm) return;

    setIsSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      let response;
      if (mode === "editor") {
        response = await fetch("/api/submissions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            assignment_id: selectedAsm.id,
            files: [
              { filename: editorFile, content: editorContent }
            ]
          })
        });
      } else {
        if (encodedSolutionFiles.length === 0) {
          setSubmitError("Vui lòng kéo thả hoặc chọn tệp tin cần nộp.");
          setIsSubmitting(false);
          return;
        }

        response = await fetch("/api/submissions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            assignment_id: selectedAsm.id,
            files: encodedSolutionFiles
          })
        });
      }

      const rawResponse = await response.text();
      let resData: { error?: string } = {};
      try {
        resData = rawResponse ? JSON.parse(rawResponse) : {};
      } catch {
        resData = { error: rawResponse.slice(0, 500) };
      }

      if (response.ok) {
        setSubmitSuccess(true);
        setSolutionFiles([]);
        setEncodedSolutionFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        
        // Refresh submissions
        fetchSubmissions(selectedAsm.id);
        setActiveTab("history");
      } else {
        setSubmitError(resData.error || `Nộp bài thất bại. Mã lỗi HTTP ${response.status}.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không rõ nguyên nhân";
      setSubmitError(`Không gửi được request nộp bài: ${message}. Hãy tải lại trang rồi thử lại.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("trs_token");
    if (!token || !selectedSubmission || !recommendation) return;

    try {
      const response = await fetch("/api/forms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          submission_id: selectedSubmission.id,
          scores: formRating,
          list_used_tcids: recommendation.recommended_testcases,
          feedback: formFeedback
        })
      });

      if (response.ok) {
        setFormSubmitted(true);
        fetchRecommendation(selectedSubmission.id);
      } else {
        const errData = await response.json();
        alert(errData.error || "Không thể gửi đánh giá.");
      }
    } catch {
      alert("Lỗi kết nối máy chủ.");
    }
  };

  const logout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const getStatusMessage = (recStatus: string) => {
    switch (recStatus) {
      case "PENDING":
        return "Hệ thống đang chạy kiểm thử chấm điểm bài nộp...";
      case "NO_TESTCASE":
        return "Hệ thống không còn testcase nào bị sai để gợi ý.";
      case "PREVIOUS_TESTCASE_NOT_COMPLETED":
        return "Bạn chưa làm đúng tất cả các testcase được gợi ý ở lần trước. Bảng bên dưới cho biết testcase nào còn sai.";
      case "DAILY_LIMIT_REACHED":
        return "Bạn đã đạt số lần xin gợi ý tối đa trong ngày (5 lần).";
      case "READY":
        return "Danh sách gợi ý testcase đã sẵn sàng!";
      case "FAILED":
        return "Lỗi tính toán gợi ý.";
      default:
        return "Không có dữ liệu.";
    }
  };

  const scoreEntries = normalizeScores(selectedSubmission?.scores ?? null);
  const passedCount = scoreEntries.filter((score) => score.passed).length;
  const totalCount = scoreEntries.length;
  const publicRows = scoreEntries
    .slice(0, PUBLIC_TESTCASE_COUNT)
    .map((score) => buildTestcaseRow(score.id, score.passed, selectedSubmission?.failed_outputs));
  const hiddenRows = scoreEntries.slice(PUBLIC_TESTCASE_COUNT);
  const publicRowsAllPassed = publicRows.length === PUBLIC_TESTCASE_COUNT && publicRows.every((row) => row.passed);
  const hiddenHasFailed = hiddenRows.some((score) => !score.passed);
  const publicTableHasHiddenFailures = publicRowsAllPassed && hiddenHasFailed;
  const canShowRecommendationRows = recommendation?.status === "READY" || recommendation?.status === "PREVIOUS_TESTCASE_NOT_COMPLETED";
  const canShowFeedbackForm = selectedSubmission?.status === "SUCCESS"
    && !!recommendation
    && ["READY", "PREVIOUS_TESTCASE_NOT_COMPLETED", "NO_TESTCASE"].includes(recommendation.status)
    && !recommendation.is_filled_form
    && !formSubmitted;
  const recommendationRows = canShowRecommendationRows
    ? (recommendation.details && recommendation.details.length > 0
        ? recommendation.details
        : recommendation.recommended_testcases.map((tcId) => {
            const metadata = getTestcaseMetadata(tcId);
            return {
              id: tcId,
              input: metadata.parameters,
              parameters: metadata.parameters,
              output: metadata.output,
              expected_output: "N/A",
              your_output: "N/A",
              real_output: "N/A",
              passed: false,
              status: "Sai",
            };
          })
      ).slice(0, 3).map((detail) => {
        const score = scoreEntries.find((entry) => entry.id === detail.id);
        const passed = detail.passed ?? score?.passed ?? false;
        return {
          id: detail.id,
          parameters: detail.parameters || detail.input,
          output: detail.output || "stdout của chương trình",
          expected_output: detail.expected_output || "N/A",
          real_output: detail.real_output || detail.your_output || "N/A",
          passed,
          status: passed ? "Đúng" : "Sai",
        };
      })
    : [];
  const recommendationTableTitle = recommendation?.status === "PREVIOUS_TESTCASE_NOT_COMPLETED"
    ? "Bảng 2: 3 testcase gợi ý lần trước"
    : "Bảng 2: 3 testcase gợi ý";
  const recommendationTableDescription = recommendation?.status === "PREVIOUS_TESTCASE_NOT_COMPLETED"
    ? "Các dòng màu đỏ là testcase gợi ý lần trước vẫn chưa đúng ở bài nộp hiện tại."
    : "Các testcase hệ thống chọn để bạn ưu tiên đối chiếu và sửa lỗi.";

  const getTestcaseRowStyle = (passed: boolean): CSSProperties => ({
    background: passed ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
  });

  const renderTestcaseTable = (
    rows: TestcaseTableRow[],
    options?: { warningBackground?: boolean },
  ) => (
    <div
      style={{
        overflowX: "auto",
        border: options?.warningBackground ? "1px solid rgba(245, 158, 11, 0.55)" : "1px solid hsl(var(--border-color))",
        borderRadius: "var(--radius-sm)",
        background: options?.warningBackground ? "rgba(245, 158, 11, 0.12)" : "transparent",
      }}
    >
      <table className="mock-table" style={{ margin: 0, minWidth: "920px" }}>
        <thead>
          <tr>
            <th>Mã TC</th>
            <th>Tham số truyền vào</th>
            <th>Output</th>
            <th>Kết quả mong muốn</th>
            <th>Kết quả real</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} style={getTestcaseRowStyle(row.passed)}>
              <td style={{ fontFamily: "var(--font-mono)", fontWeight: "bold", color: "hsl(var(--color-primary))", whiteSpace: "nowrap" }}>
                #{row.id}
              </td>
              <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
                <code>{row.parameters}</code>
              </td>
              <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
                {row.output}
              </td>
              <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>
                {row.expected_output}
              </td>
              <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>
                {row.real_output}
              </td>
              <td>
                <span className={`mock-badge ${row.passed ? "success" : "danger"}`}>
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

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
              Sinh viên: <strong>{studentName}</strong>
            </span>
            <button onClick={logout} className="sys-status" style={{ background: "rgba(239, 68, 68, 0.1)", color: "rgb(239, 68, 68)", borderColor: "rgba(239, 68, 68, 0.2)", textDecoration: "none", cursor: "pointer" }}>
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <div className="sidebar-layout">
        {/* Sidebar Nav */}
        <aside className="sidebar">
          <div className="sidebar-title">Menu Nộp Bài</div>
          <nav className="sidebar-nav">
            <button className={`sidebar-link ${activeTab === "assignments" ? "active" : ""}`} onClick={() => setActiveTab("assignments")}>
              Bài tập lớn của tôi
            </button>
            <button className={`sidebar-link ${activeTab === "submit" ? "active" : ""}`} onClick={() => setActiveTab("submit")} disabled={!selectedAsm}>
              Nộp bài giải
            </button>
            <button className={`sidebar-link ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")} disabled={!selectedAsm}>
              Lịch sử nộp & Gợi ý
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="content-area">
          {activeTab === "assignments" && (
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>Bài tập lớn tham gia</h1>
              <p style={{ color: "hsl(var(--text-secondary))", marginBottom: "2rem" }}>
                Danh sách các bài tập lớn môn học bạn được phân quyền nộp bài và khảo sát testcase.
              </p>

              {isLoadingAsms && <p style={{ color: "hsl(var(--text-muted))" }}>Đang tải bài tập...</p>}
              {!isLoadingAsms && assignments.length === 0 && (
                <div className="tech-panel" style={{ textAlign: "center", padding: "3rem" }}>
                  <p style={{ color: "hsl(var(--text-muted))" }}>Bạn chưa được đăng ký vào bài tập lớn nào.</p>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {assignments.map((asm) => (
                  <div
                    key={asm.id}
                    className={`tech-panel ${selectedAsm?.id === asm.id ? "active-border" : ""}`}
                    onClick={() => setSelectedAsm(asm)}
                    style={{ cursor: "pointer", marginTop: "0", border: selectedAsm?.id === asm.id ? "1px solid hsl(var(--color-primary))" : "" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: selectedAsm?.id === asm.id ? "hsl(var(--color-primary))" : "#fff" }}>{asm.name}</h3>
                      <span className="mock-badge warning" style={{ fontFamily: "var(--font-mono)" }}>
                        Hạn nộp: {isMounted && asm.end_date ? new Date(asm.end_date).toLocaleString('vi-VN') : "Không giới hạn"}
                      </span>
                    </div>
                    <p style={{ color: "hsl(var(--text-secondary))", fontSize: "0.95rem", marginBottom: "1rem" }}>{asm.description}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "hsl(var(--text-muted))" }}>
                      <span>Giảng viên: {asm.author_name}</span>
                      {selectedAsm?.id === asm.id && <span style={{ color: "hsl(var(--color-primary))", fontWeight: "600" }}>Đã chọn</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "submit" && selectedAsm && (
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>Nộp bài giải mới</h1>
              <p style={{ color: "hsl(var(--text-secondary))", marginBottom: "2rem" }}>
                Nộp mã nguồn cho bài tập: <strong style={{ color: "hsl(var(--color-primary))" }}>{selectedAsm.name}</strong>
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
                {/* Method 1: Paste Code Editor */}
                <div className="tech-panel" style={{ marginTop: "0", display: "flex", flexDirection: "column" }}>
                  <h3 className="tech-panel-title">Phương án 1: Trình soạn thảo mã</h3>
                  <div className="form-group" style={{ marginBottom: "1rem" }}>
                    <label className="form-label">Tên tệp tin (ví dụ: solution.cpp, kNN.cpp)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editorFile}
                      onChange={(e) => setEditorFile(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <label className="form-label">Mã nguồn của bạn</label>
                    <textarea
                      className="form-control"
                      value={editorContent}
                      onChange={(e) => setEditorContent(e.target.value)}
                      style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", flex: 1, minHeight: "220px", resize: "vertical" }}
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleSubmitSolution("editor")}
                    disabled={isSubmitting}
                    style={{ marginTop: "1rem", alignSelf: "flex-end" }}
                  >
                    {isSubmitting ? "Đang chấm..." : "Nộp nội dung trong editor"}
                  </button>
                </div>

                {/* Method 2: Drag & Drop C++ source files */}
                <div className="tech-panel" style={{ marginTop: "0", display: "flex", flexDirection: "column" }}>
                  <h3 className="tech-panel-title">Phương án 2: Kéo & thả file mã nguồn</h3>
                  
                  <div
                    className={`upload-zone ${dragActive ? "drag-active" : ""}`}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", border: dragActive ? "2px dashed hsl(var(--color-primary))" : "" }}
                  >
                    <div className="upload-icon">FILE</div>
                    <div className="upload-text">
                      {isEncodingFiles
                        ? "Đang đọc file..."
                        : encodedSolutionFiles.length > 0
                          ? `Đã sẵn sàng: ${encodedSolutionFiles.map(f => f.filename).join(', ')}`
                          : "Kéo thả .zip hoặc chọn lần lượt kNN.cpp, kNN.hpp"}
                    </div>
                    <div style={{ marginTop: "0.5rem", color: "hsl(var(--text-muted))", fontSize: "0.82rem", lineHeight: 1.5 }}>
                      Có thể chọn nhiều file cùng lúc hoặc chọn từng file nhiều lần; hệ thống sẽ tự cộng dồn theo tên file.
                    </div>
                    <input
                      type="file"
                      multiple
                      accept=".cpp,.c,.h,.hpp,.zip"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                    />
                  </div>

                  <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end", gap: "0.75rem", flexWrap: "wrap" }}>
                    {(encodedSolutionFiles.length > 0 || solutionFiles.length > 0) && (
                      <button
                        className="btn"
                        onClick={clearSelectedFiles}
                        disabled={isSubmitting || isEncodingFiles}
                        style={{ background: "rgba(148, 163, 184, 0.12)", color: "hsl(var(--text-secondary))", border: "1px solid rgba(148, 163, 184, 0.25)" }}
                      >
                        Xóa file đã chọn
                      </button>
                    )}
                    <button
                      className="btn btn-primary"
                      onClick={() => handleSubmitSolution("file")}
                      disabled={isSubmitting || isEncodingFiles || encodedSolutionFiles.length === 0}
                    >
                      {isSubmitting ? "Đang gửi chấm..." : isEncodingFiles ? "Đang đọc file..." : "Nộp file đính kèm"}
                    </button>
                  </div>
                </div>
              </div>

              {submitSuccess && (
                <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "var(--radius-sm)", color: "hsl(var(--color-success))" }}>
                  Gửi bài nộp thành công! Kết quả chấm đang được hiển thị ở tab lịch sử.
                </div>
              )}

              {submitError && (
                <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--radius-sm)", color: "rgb(239, 68, 68)" }}>
                  {submitError}
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && selectedAsm && (
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>Lịch sử nộp & Nhận gợi ý</h1>
              <p style={{ color: "hsl(var(--text-secondary))", marginBottom: "2rem" }}>
                Xem chi tiết lịch sử thực thi và kết quả khuyến nghị testcase cho bài tập: <strong>{selectedAsm.name}</strong>
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: "2rem" }}>
                {/* Submission Select Side */}
                <div>
                  <h4 style={{ fontWeight: "700", marginBottom: "1rem" }}>Chọn lần nộp</h4>
                  {isLoadingSubs && <p style={{ color: "hsl(var(--text-muted))" }}>Đang tải lịch sử...</p>}
                  {!isLoadingSubs && submissions.length === 0 && (
                    <p style={{ color: "hsl(var(--text-muted))" }}>Chưa có lần nộp nào.</p>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {submissions.map((sub, idx) => {
                      const submissionIndex = submissions.length - idx;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => setSelectedSubmission(sub)}
                          className={`sidebar-link ${selectedSubmission?.id === sub.id ? "active" : ""}`}
                          style={{
                            textAlign: "left",
                            padding: "0.75rem 1rem",
                            width: "100%",
                            border: "none",
                            borderRadius: "var(--radius-sm)",
                            background: selectedSubmission?.id === sub.id ? "rgba(255,255,255,0.05)" : "transparent",
                            cursor: "pointer"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                            <span>Lần nộp #{submissionIndex}</span>
                            <span style={{
                              color: sub.status === "SUCCESS" ? "hsl(var(--color-success))" :
                                     sub.status === "FAILED" ? "rgb(239, 68, 68)" : "yellow"
                            }}>{sub.status}</span>
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-muted))", marginTop: "2px" }}>
                            {isMounted ? `${new Date(sub.created_at).toLocaleTimeString()} - ${new Date(sub.created_at).toLocaleDateString()}` : ""}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Details Side */}
                {selectedSubmission && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {/* Grader Output Log */}
                    <div className="tech-panel" style={{ marginTop: "0" }}>
                      <h3 className="tech-panel-title">Chi tiết lần chấm bài</h3>
                      <div style={{ display: "flex", gap: "2rem", marginBottom: "1rem" }}>
                        <div>Trạng thái: <strong style={{ color: selectedSubmission.status === "SUCCESS" ? "hsl(var(--color-success))" : "red" }}>{selectedSubmission.status}</strong></div>
                        {totalCount > 0 && (
                          <div>Đạt: <strong>{passedCount}/{totalCount} testcase</strong></div>
                        )}
                      </div>
                      
                      {selectedSubmission.compile_error && (
                        <div style={{ background: "#1a0b0b", borderLeft: "4px solid red", padding: "1rem", fontFamily: "var(--font-mono)", fontSize: "0.85rem", whiteSpace: "pre-wrap", color: "#ff8888", marginBottom: "1rem" }}>
                          <strong>Compile Error:</strong><br />
                          {selectedSubmission.compile_error}
                        </div>
                      )}

                      {selectedSubmission.runtime_error && (
                        <div style={{ background: "#1a0b0b", borderLeft: "4px solid red", padding: "1rem", fontFamily: "var(--font-mono)", fontSize: "0.85rem", whiteSpace: "pre-wrap", color: "#ff8888", marginBottom: "1rem" }}>
                          <strong>Runtime Error:</strong><br />
                          {selectedSubmission.runtime_error}
                        </div>
                      )}

                      {publicRows.length > 0 && (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
                            <div>
                              <h4 style={{ fontWeight: 700, marginBottom: "0.25rem" }}>Bảng 1: 10 testcase đại diện</h4>
                              <div style={{ fontSize: "0.85rem", color: "hsl(var(--text-secondary))" }}>
                                Chỉ hiển thị 10 testcase đầu tiên, các testcase còn lại được ẩn.
                              </div>
                            </div>
                            {publicTableHasHiddenFailures && (
                              <span className="mock-badge warning">
                                10 TC đầu đúng, TC ẩn còn sai
                              </span>
                            )}
                          </div>
                          {renderTestcaseTable(publicRows, { warningBackground: publicTableHasHiddenFailures })}
                        </div>
                      )}
                    </div>

                    {/* Recommendation details */}
                    {recommendation && (
                      <div className="tech-panel" style={{ marginTop: "0" }}>
                        <h3 className="tech-panel-title">Gợi ý testcase khuyến nghị</h3>
                        <p style={{ color: "hsl(var(--text-secondary))", marginBottom: "1rem" }}>
                          {getStatusMessage(recommendation.status)}
                        </p>

                        {canShowRecommendationRows && recommendationRows.length > 0 && (
                          <div style={{ marginBottom: "1.5rem" }}>
                            <div style={{ marginBottom: "0.75rem" }}>
                              <h4 style={{ fontWeight: 700, marginBottom: "0.25rem" }}>{recommendationTableTitle}</h4>
                              <div style={{ fontSize: "0.85rem", color: "hsl(var(--text-secondary))" }}>
                                {recommendationTableDescription}
                              </div>
                            </div>
                            {renderTestcaseTable(recommendationRows)}
                            <p style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))", marginTop: "0.75rem" }}>
                              * Bạn hãy đối chiếu tham số vào, kết quả thực tế (kết quả của bạn) và kết quả mong đợi để tìm lỗi sai trong mã nguồn.
                            </p>
                          </div>
                        )}

                        {/* Recommendation Feedback Form */}
                        {canShowFeedbackForm && (
                          <form onSubmit={handleFeedbackSubmit} style={{ borderTop: "1px solid hsl(var(--border-color))", paddingTop: "1.5rem", marginTop: "1rem" }}>
                            <h4 style={{ fontWeight: "700", marginBottom: "1rem" }}>
                              {recommendation.status === "NO_TESTCASE" ? "Khảo sát sau khi chấm bài" : "Khảo sát phản hồi gợi ý"}
                            </h4>
                            
                            <div className="form-group" style={{ marginBottom: "1rem" }}>
                              <label className="form-label">
                                {recommendation.status === "NO_TESTCASE" ? "Mức độ hài lòng với kết quả chấm bài (1-5 sao)" : "Mức độ hữu ích của gợi ý này (1-5 sao)"}
                              </label>
                              <select
                                className="form-control"
                                value={formRating}
                                onChange={(e) => setFormRating(Number(e.target.value))}
                                style={{ maxWidth: "150px", background: "rgba(0,0,0,0.2)" }}
                              >
                                <option value="5" style={{ background: "#222" }}>5 sao (Rất tốt)</option>
                                <option value="4" style={{ background: "#222" }}>4 sao (Tốt)</option>
                                <option value="3" style={{ background: "#222" }}>3 sao (Bình thường)</option>
                                <option value="2" style={{ background: "#222" }}>2 sao (Kém)</option>
                                <option value="1" style={{ background: "#222" }}>1 sao (Rất tệ)</option>
                              </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: "1rem" }}>
                              <label className="form-label">
                                {recommendation.status === "NO_TESTCASE" ? "Ý kiến đóng góp thêm" : "Ý kiến đóng góp thêm về testcase gợi ý"}
                              </label>
                              <textarea
                                className="form-control"
                                placeholder={recommendation.status === "NO_TESTCASE" ? "Bạn có góp ý gì về trải nghiệm nộp bài không?..." : "Gợi ý này có giúp bạn tìm ra lỗi không?..."}
                                value={formFeedback}
                                onChange={(e) => setFormFeedback(e.target.value)}
                                rows={3}
                              />
                            </div>

                            <button type="submit" className="btn btn-primary">
                              Gửi đánh giá phản hồi
                            </button>
                          </form>
                        )}

                        {(recommendation.is_filled_form || formSubmitted) && (
                          <div style={{ marginTop: "1rem", padding: "0.75rem", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.15)", borderRadius: "var(--radius-sm)", color: "hsl(var(--color-success))", fontSize: "0.9rem" }}>
                            Cảm ơn bạn đã gửi đánh giá phản hồi hữu ích cho lần gợi ý này!
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
