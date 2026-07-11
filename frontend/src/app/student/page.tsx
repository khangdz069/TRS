"use client";

import Link from "next/link";
import { useState, useEffect, useRef, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

interface Assignment {
  id: string;
  name: string;
  description: string;
  assignment_type?: AssignmentType;
  supported_languages?: string[];
  problem_statement?: string;
  starter_code?: string;
  type_config?: string;
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

type StudentTab = "assignments" | "submit" | "history";
type AssignmentType = "STANDARD" | "FILL_BLANK" | "DEBUGGING" | "PROJECT" | "QUIZ_CODE";

const ASSIGNMENT_TYPES: Array<{ value: AssignmentType; label: string }> = [
  { value: "STANDARD", label: "Bài thường" },
  { value: "FILL_BLANK", label: "Bài đục lỗ" },
  { value: "DEBUGGING", label: "Bài sửa lỗi" },
  { value: "PROJECT", label: "Mini project" },
  { value: "QUIZ_CODE", label: "Trắc nghiệm code" },
];

const typeLabel = (value?: string) =>
  ASSIGNMENT_TYPES.find((item) => item.value === value)?.label || "Bài thường";

const LANGUAGE_OPTIONS = [
  { value: "cpp", label: "C++", extension: ".cpp" },
  { value: "c", label: "C", extension: ".c" },
  { value: "java", label: "Java", extension: ".java" },
  { value: "python", label: "Python", extension: ".py" },
  { value: "javascript", label: "JavaScript", extension: ".js" },
  { value: "typescript", label: "TypeScript", extension: ".ts" },
  { value: "go", label: "Go", extension: ".go" },
  { value: "rust", label: "Rust", extension: ".rs" },
];

const languageLabel = (values?: string[]) => {
  if (!values || values.length === 0) return "C++";
  return values.map((value) => LANGUAGE_OPTIONS.find((item) => item.value === value)?.label || value).join(", ");
};

const primaryLanguage = (assignment?: Assignment) => assignment?.supported_languages?.[0] || "cpp";

const languageExtension = (language: string) =>
  LANGUAGE_OPTIONS.find((item) => item.value === language)?.extension || ".cpp";

const defaultSubmissionFilename = (assignment: Assignment) => {
  const extension = languageExtension(primaryLanguage(assignment));
  if (assignment.assignment_type === "QUIZ_CODE") return `answer${extension}`;
  if (assignment.assignment_type === "PROJECT") return `main${extension}`;
  return `solution${extension}`;
};

const acceptedFileTypes = (assignment: Assignment) => {
  const languageExtensions = (assignment.supported_languages?.length ? assignment.supported_languages : ["cpp"])
    .map(languageExtension);
  return Array.from(new Set([...languageExtensions, ".h", ".hpp", ".zip"])).join(",");
};

const defaultEditorContent = (assignment: Assignment) => {
  const language = primaryLanguage(assignment);
  if (assignment.assignment_type === "QUIZ_CODE") {
    return "// Viết câu trả lời code ngắn của bạn ở đây.\n";
  }
  if (assignment.assignment_type === "FILL_BLANK") {
    return "// Hoàn thiện các phần còn thiếu trong starter code.\n";
  }
  if (assignment.assignment_type === "DEBUGGING") {
    return "// Dán bản code đã sửa lỗi của bạn ở đây.\n";
  }
  if (assignment.assignment_type === "PROJECT") {
    return language === "cpp"
      ? '#include "main.hpp"\n\n// Có thể nộp file chính ở đây hoặc upload toàn bộ project dạng .zip.\n'
      : "// Có thể nộp file chính ở đây hoặc upload toàn bộ project dạng .zip.\n";
  }
  return language === "cpp"
    ? '#include "kNN.hpp"\n\n// Viết mã nguồn giải bài tập của bạn ở đây.\n'
    : "// Viết mã nguồn giải bài tập của bạn ở đây.\n";
};

const submitProfile = (assignment: Assignment) => {
  switch (assignment.assignment_type) {
    case "FILL_BLANK":
      return {
        title: "Hoàn thiện bài đục lỗ",
        subtitle: "Điền phần còn thiếu và nộp bản hoàn chỉnh để hệ thống chấm.",
        editorTitle: "Hoàn thiện trong editor",
        editorLabel: "Bản code hoàn chỉnh",
        fileTitle: "Nộp file đã hoàn thiện",
        filePrompt: "Kéo thả file đã hoàn thiện hoặc .zip nếu bài có nhiều file",
        submitLabel: "Nộp bài đã hoàn thiện",
      };
    case "DEBUGGING":
      return {
        title: "Nộp bản sửa lỗi",
        subtitle: "Sửa code lỗi theo đề bài rồi nộp bản đã chạy đúng.",
        editorTitle: "Sửa lỗi trong editor",
        editorLabel: "Bản code đã sửa",
        fileTitle: "Nộp file đã sửa lỗi",
        filePrompt: "Kéo thả file đã sửa hoặc .zip nếu bài có nhiều file",
        submitLabel: "Nộp bản sửa lỗi",
      };
    case "PROJECT":
      return {
        title: "Nộp mini project",
        subtitle: "Nộp file chính hoặc đóng gói toàn bộ project thành .zip.",
        editorTitle: "File chính",
        editorLabel: "Nội dung file chính",
        fileTitle: "Nộp project",
        filePrompt: "Kéo thả .zip hoặc chọn nhiều file trong project",
        submitLabel: "Nộp project",
      };
    case "QUIZ_CODE":
      return {
        title: "Trả lời trắc nghiệm code",
        subtitle: "Viết lời giải code ngắn theo yêu cầu của câu hỏi.",
        editorTitle: "Câu trả lời code",
        editorLabel: "Đáp án của bạn",
        fileTitle: "Nộp file đáp án",
        filePrompt: "Kéo thả file đáp án hoặc .zip nếu cần đính kèm thêm",
        submitLabel: "Nộp đáp án",
      };
    default:
      return {
        title: "Nộp bài giải",
        subtitle: "Nộp mã nguồn để hệ thống chấm bằng testcase.",
        editorTitle: "Trình soạn thảo mã",
        editorLabel: "Mã nguồn của bạn",
        fileTitle: "Kéo & thả file mã nguồn",
        filePrompt: "Kéo thả .zip hoặc chọn các file mã nguồn",
        submitLabel: "Nộp bài giải",
      };
  }
};

const STUDENT_ACTIVE_TAB_KEY = "trs_student_active_tab";
const STUDENT_SELECTED_ASSIGNMENT_KEY = "trs_student_selected_assignment_id";
const STUDENT_SELECTED_SUBMISSION_KEY = "trs_student_selected_submission_id";

const isStudentTab = (value: string | null): value is StudentTab =>
  value === "assignments" || value === "submit" || value === "history";

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

  const [activeTab, setActiveTab] = useState<StudentTab>("assignments");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [assignmentQuery, setAssignmentQuery] = useState("");
  const [assignmentTypeFilter, setAssignmentTypeFilter] = useState<"ALL" | AssignmentType>("ALL");
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");
  
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
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    setIsMounted(true);
    setCurrentTime(Date.now());
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
    const savedTab = localStorage.getItem(STUDENT_ACTIVE_TAB_KEY);
    if (isStudentTab(savedTab)) {
      setActiveTab(savedTab);
    }
    setStudentName(parsedUser.name || "Sinh viên");
    fetchAssignments(token);
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(STUDENT_ACTIVE_TAB_KEY, activeTab);
    }
  }, [activeTab, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    if (selectedAsm) {
      localStorage.setItem(STUDENT_SELECTED_ASSIGNMENT_KEY, selectedAsm.id);
    }
  }, [selectedAsm, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    if (selectedSubmission) {
      localStorage.setItem(STUDENT_SELECTED_SUBMISSION_KEY, selectedSubmission.id);
    }
  }, [selectedSubmission, isMounted]);

  const fetchAssignments = async (token: string) => {
    setIsLoadingAsms(true);
    try {
      const response = await fetch("/api/assignments", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data: Assignment[] = await response.json();
        setAssignments(data);
        if (data.length > 0) {
          const savedAssignmentId = localStorage.getItem(STUDENT_SELECTED_ASSIGNMENT_KEY);
          setSelectedAsm(data.find((assignment) => assignment.id === savedAssignmentId) || data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch assignments", err);
    } finally {
      setIsLoadingAsms(false);
    }
  };

  const fetchSubmissions = async (asmId: string, options?: { preferNewest?: boolean }) => {
    const token = localStorage.getItem("trs_token");
    if (!token || !asmId) return;

    setIsLoadingSubs(true);
    try {
      const response = await fetch(`/api/submissions?assignment_id=${asmId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data: Submission[] = await response.json();
        setSubmissions(data);
        if (data.length > 0) {
          const savedSubmissionId = options?.preferNewest ? null : localStorage.getItem(STUDENT_SELECTED_SUBMISSION_KEY);
          setSelectedSubmission(data.find((submission) => submission.id === savedSubmissionId) || data[0]);
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
    if (!selectedAsm) return;
    setEditorFile(defaultSubmissionFilename(selectedAsm));
    setEditorContent(selectedAsm.starter_code?.trim() ? selectedAsm.starter_code : defaultEditorContent(selectedAsm));
    setSolutionFiles([]);
    setEncodedSolutionFiles([]);
    setSubmitSuccess(false);
    setSubmitError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [selectedAsm?.id]);

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
        fetchSubmissions(selectedAsm.id, { preferNewest: true });
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

  const getAssignmentStatus = (assignment: Assignment) => {
    if (!assignment.end_date) return "OPEN";
    const endTime = new Date(assignment.end_date).getTime();
    if (!Number.isFinite(endTime)) return "OPEN";
    return endTime >= currentTime ? "OPEN" : "CLOSED";
  };

  const getAssignmentDueInfo = (assignment: Assignment) => {
    if (!assignment.end_date) {
      return {
        dateLabel: "Không giới hạn",
        helper: "Luôn nhận bài nộp",
      };
    }

    const endTime = new Date(assignment.end_date).getTime();
    if (!Number.isFinite(endTime)) {
      return {
        dateLabel: "Không giới hạn",
        helper: "Chưa có hạn nộp hợp lệ",
      };
    }

    const dateLabel = isMounted
      ? new Date(assignment.end_date).toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    const diffMs = endTime - currentTime;
    if (diffMs < 0) {
      return {
        dateLabel,
        helper: "Đã hết hạn",
      };
    }

    const diffDays = Math.ceil(diffMs / 86400000);
    return {
      dateLabel,
      helper: diffDays <= 1 ? "Còn hôm nay" : `Còn ${diffDays} ngày`,
    };
  };

  const assignmentSearchTerm = assignmentQuery.trim().toLowerCase();
  const assignmentTypeOptions = Array.from(
    new Set(assignments.map((assignment) => assignment.assignment_type || "STANDARD"))
  ) as AssignmentType[];
  const filteredAssignments = assignments.filter((assignment) => {
    const status = getAssignmentStatus(assignment);
    const matchesType = assignmentTypeFilter === "ALL" || (assignment.assignment_type || "STANDARD") === assignmentTypeFilter;
    const matchesStatus = assignmentStatusFilter === "ALL" || status === assignmentStatusFilter;
    const searchableText = [
      assignment.name,
      assignment.description,
      assignment.author_name,
      typeLabel(assignment.assignment_type),
      assignment.id,
    ].join(" ").toLowerCase();

    return matchesType && matchesStatus && (!assignmentSearchTerm || searchableText.includes(assignmentSearchTerm));
  });
  const openAssignmentCount = assignments.filter((assignment) => getAssignmentStatus(assignment) === "OPEN").length;
  const closedAssignmentCount = assignments.length - openAssignmentCount;
  const selectedSubmitProfile = selectedAsm ? submitProfile(selectedAsm) : null;
  const selectedAssignmentBrief = selectedAsm?.problem_statement?.trim() || selectedAsm?.description?.trim() || "";
  const selectedAssignmentConfig = selectedAsm?.type_config?.trim() || "";

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
  const getTestcaseRowStyle = (passed: boolean): CSSProperties => ({
    background: passed ? "hsl(154 68% 96%)" : "hsl(0 85% 98%)",
  });

  const renderTestcaseTable = (
    rows: TestcaseTableRow[],
    options?: { warningBackground?: boolean; compact?: "result" | "recommendation" },
  ) => (
    <div
      className="student-testcase-table-wrap"
      style={{
        overflowX: "auto",
        border: options?.warningBackground ? "1px solid rgba(245, 158, 11, 0.55)" : "1px solid hsl(var(--border-color))",
        borderRadius: "var(--radius-sm)",
        background: options?.warningBackground ? "hsl(42 100% 96%)" : "transparent",
      }}
    >
      <table className={`mock-table ${options?.compact ? "student-testcase-table compact" : ""}`} style={{ margin: 0, minWidth: options?.compact ? "520px" : "920px" }}>
        <thead>
          {options?.compact ? (
            <tr>
              <th>TC</th>
              <th>{options.compact === "recommendation" ? "Tham số cần thử" : "Tham số"}</th>
              <th>{options.compact === "recommendation" ? "Output" : "Kết quả"}</th>
            </tr>
          ) : (
            <tr>
              <th>Mã TC</th>
              <th>Tham số truyền vào</th>
              <th>Output</th>
              <th>Kết quả mong muốn</th>
              <th>Kết quả real</th>
              <th>Status</th>
            </tr>
          )}
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} style={options?.compact === "recommendation" ? undefined : getTestcaseRowStyle(row.passed)}>
              {options?.compact ? (
                <>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: "bold", color: "hsl(var(--color-primary))", whiteSpace: "nowrap" }}>#{row.id}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.84rem" }}><code>{row.parameters}</code></td>
                  <td>
                    {options.compact === "recommendation" ? (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.84rem" }}>{row.output}</span>
                    ) : (
                      <span className={`mock-badge ${row.passed ? "success" : "danger"}`}>{row.status}</span>
                    )}
                  </td>
                </>
              ) : (
                <>
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
                </>
              )}
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
          <div className="teacher-header-actions">
            <span>
              Sinh viên: <strong>{studentName}</strong>
            </span>
            <button onClick={logout} className="btn btn-danger">
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <div className="sidebar-layout">
        {/* Sidebar Nav */}
        <aside className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
          <div className="sidebar-top">
            <button
              type="button"
              className="sidebar-toggle"
              onClick={() => setIsSidebarCollapsed((current) => !current)}
              aria-label={isSidebarCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
              aria-pressed={isSidebarCollapsed}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <div className="sidebar-title">Menu Nộp Bài</div>
          </div>
          <nav className="sidebar-nav">
            <button className={`sidebar-link ${activeTab === "assignments" ? "active" : ""}`} onClick={() => setActiveTab("assignments")} title="Bài tập của tôi">
              <span className="sidebar-icon assignment" aria-hidden="true"></span>
              <span className="sidebar-label">Bài tập của tôi</span>
            </button>
            {selectedAsm && (
              <div className="sidebar-assignment-subnav">
                <div className="sidebar-selected-assignment" title={selectedAsm.name}>
                  <span className="sidebar-selected-kicker">Bài đang chọn</span>
                  <strong>{selectedAsm.name}</strong>
                </div>
                <button className={`sidebar-sub-link ${activeTab === "submit" ? "active" : ""}`} onClick={() => setActiveTab("submit")} title="Nộp bài giải">
                  <span className="sidebar-icon submit" aria-hidden="true"></span>
                  <span className="sidebar-label">Nộp bài giải</span>
                </button>
                <button className={`sidebar-sub-link ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")} title="Lịch sử nộp & Gợi ý">
                  <span className="sidebar-icon history" aria-hidden="true"></span>
                  <span className="sidebar-label">Lịch sử & gợi ý</span>
                </button>
              </div>
            )}
          </nav>
          <div className="sidebar-account">
            <div className="sidebar-user-card">
              <span>Sinh viên</span>
              <strong>{studentName}</strong>
            </div>
            <button type="button" className="sidebar-logout-button" onClick={logout} title="Đăng xuất">
              <span className="sidebar-logout-icon" aria-hidden="true"></span>
              <span className="sidebar-label">Đăng xuất</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="content-area">
          {activeTab === "assignments" && (
            <div className="student-assignment-page">
              <div className="student-assignment-toolbar">
                <div>
                  <span className="student-assignment-eyebrow">Không gian học tập</span>
                  <h1>Bài tập</h1>
                </div>
                <div className="student-assignment-stats" aria-label="Tổng quan bài tập">
                  <div>
                    <span>Tất cả</span>
                    <strong>{assignments.length}</strong>
                  </div>
                  <div>
                    <span>Đang mở</span>
                    <strong>{openAssignmentCount}</strong>
                  </div>
                  <div>
                    <span>Đóng</span>
                    <strong>{closedAssignmentCount}</strong>
                  </div>
                </div>
              </div>

              {isLoadingAsms && <div className="assignment-list-state">Đang tải bài tập...</div>}
              {!isLoadingAsms && assignments.length === 0 && (
                <div className="tech-panel" style={{ textAlign: "center", padding: "3rem" }}>
                  <p style={{ color: "hsl(var(--text-muted))" }}>Bạn chưa được đăng ký vào bài tập nào.</p>
                </div>
              )}

              {!isLoadingAsms && assignments.length > 0 && (
                <div className="student-assignment-workspace">
                  <section className="student-assignment-list-panel" aria-label="Danh sách bài tập tham gia">
                    <div className="student-assignment-list-header">
                      <div>
                        <h2>Bài</h2>
                        <p>{filteredAssignments.length}/{assignments.length}</p>
                      </div>
                    </div>

                    <div className="student-assignment-list-tools">
                      <label className="assignment-search-control">
                        <span aria-hidden="true" className="assignment-search-icon"></span>
                        <input
                          placeholder="Tìm bài"
                          value={assignmentQuery}
                          onChange={(e) => setAssignmentQuery(e.target.value)}
                        />
                        {assignmentQuery && (
                          <button type="button" onClick={() => setAssignmentQuery("")} aria-label="Xóa tìm kiếm">
                            ×
                          </button>
                        )}
                      </label>
                      <select
                        className="assignment-filter-select"
                        value={assignmentTypeFilter}
                        onChange={(e) => setAssignmentTypeFilter(e.target.value as "ALL" | AssignmentType)}
                      >
                        <option value="ALL">Mọi dạng</option>
                        {assignmentTypeOptions.map((type) => (
                          <option key={type} value={type}>{typeLabel(type)}</option>
                        ))}
                      </select>
                      <div className="student-assignment-filter-tabs" aria-label="Lọc bài tập theo trạng thái">
                        <button
                          type="button"
                          className={assignmentStatusFilter === "ALL" ? "active" : ""}
                          onClick={() => setAssignmentStatusFilter("ALL")}
                        >
                          Tất cả <span>{assignments.length}</span>
                        </button>
                        <button
                          type="button"
                          className={assignmentStatusFilter === "OPEN" ? "active" : ""}
                          onClick={() => setAssignmentStatusFilter("OPEN")}
                        >
                          Mở <span>{openAssignmentCount}</span>
                        </button>
                        <button
                          type="button"
                          className={assignmentStatusFilter === "CLOSED" ? "active" : ""}
                          onClick={() => setAssignmentStatusFilter("CLOSED")}
                        >
                          Đóng <span>{closedAssignmentCount}</span>
                        </button>
                      </div>
                    </div>

                    <div className="student-assignment-list-scroll">
                      {filteredAssignments.length === 0 && (
                        <div className="assignment-list-state">Không tìm thấy bài tập phù hợp.</div>
                      )}
                      {filteredAssignments.map((asm) => {
                        const status = getAssignmentStatus(asm);
                        const isSelected = selectedAsm?.id === asm.id;
                        const dueInfo = getAssignmentDueInfo(asm);
                        return (
                          <button
                            key={asm.id}
                            type="button"
                            className={`student-assignment-row ${isSelected ? "selected" : ""}`}
                            onClick={() => setSelectedAsm(asm)}
                          >
                            <span className={`student-assignment-status-dot ${status.toLowerCase()}`} aria-hidden="true"></span>
                            <span className="student-assignment-row-main">
                              <strong>{asm.name}</strong>
                              <small>{typeLabel(asm.assignment_type)}</small>
                            </span>
                            <span className={`student-assignment-row-state ${status.toLowerCase()}`}>
                              {dueInfo.helper}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="student-assignment-detail-card" aria-label="Chi tiết bài tập đang chọn">
                    {selectedAsm ? (
                      (() => {
                        const selectedStatus = getAssignmentStatus(selectedAsm);
                        const selectedDueInfo = getAssignmentDueInfo(selectedAsm);
                        return (
                      <div className="student-assignment-detail-inner">
                        <div className="student-assignment-detail-kicker">
                          <span className={`student-assignment-row-state ${selectedStatus.toLowerCase()}`}>
                            {selectedStatus === "OPEN" ? "Đang nhận bài" : "Đã đóng"}
                          </span>
                        </div>

                        <div className="student-assignment-detail-header">
                          <div>
                            <h2>{selectedAsm.name}</h2>
                            {selectedAsm.description && <p>{selectedAsm.description}</p>}
                          </div>
                        </div>

                        <div className="student-assignment-meta-grid">
                          <div>
                            <span>Giảng viên</span>
                            <strong>{selectedAsm.author_name || "Chưa rõ"}</strong>
                          </div>
                          <div>
                            <span>Hạn nộp</span>
                            <strong>{selectedDueInfo.dateLabel}</strong>
                          </div>
                        </div>

                        <div className="student-assignment-actions">
                          <button className="btn btn-primary" onClick={() => setActiveTab("submit")} disabled={selectedStatus !== "OPEN"}>
                            Nộp bài giải
                          </button>
                          <button className="btn btn-secondary" onClick={() => setActiveTab("history")}>
                            Lịch sử & gợi ý
                          </button>
                        </div>
                      </div>
                        );
                      })()
                    ) : (
                      <div className="student-assignment-empty">
                        <h2>Chọn một bài tập</h2>
                        <p>Thông tin chi tiết và thao tác nộp bài sẽ hiện ở đây.</p>
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          )}

          {activeTab === "submit" && selectedAsm && selectedSubmitProfile && (
            <div className="student-submit-page">
              <div className="student-submit-toolbar">
                <div>
                  <span className="student-assignment-eyebrow">{typeLabel(selectedAsm.assignment_type)}</span>
                  <h1>{selectedSubmitProfile.title}</h1>
                  <p>{selectedSubmitProfile.subtitle} <strong>{selectedAsm.name}</strong></p>
                </div>
              </div>

              <div className="student-submit-context">
                <div className="student-submit-meta" aria-label="Thông tin bài nộp">
                  <div>
                    <span>Dạng bài</span>
                    <strong>{typeLabel(selectedAsm.assignment_type)}</strong>
                  </div>
                  <div>
                    <span>Ngôn ngữ</span>
                    <strong>{languageLabel(selectedAsm.supported_languages)}</strong>
                  </div>
                </div>
                {selectedAssignmentBrief && (
                  <div className="student-submit-brief">
                    <span>Đề bài</span>
                    <p>{selectedAssignmentBrief}</p>
                  </div>
                )}
                {selectedAssignmentConfig && (
                  <div className="student-submit-brief">
                    <span>Ghi chú cấu hình</span>
                    <p>{selectedAssignmentConfig}</p>
                  </div>
                )}
              </div>

              <div className="submit-grid">
                <div className="tech-panel" style={{ marginTop: "0", display: "flex", flexDirection: "column" }}>
                  <h3 className="tech-panel-title">{selectedSubmitProfile.editorTitle}</h3>
                  <div className="form-group" style={{ marginBottom: "1rem" }}>
                    <label className="form-label">Tên tệp</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editorFile}
                      onChange={(e) => setEditorFile(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <label className="form-label">{selectedSubmitProfile.editorLabel}</label>
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
                    {isSubmitting ? "Đang chấm..." : selectedSubmitProfile.submitLabel}
                  </button>
                </div>

                <div className="tech-panel" style={{ marginTop: "0", display: "flex", flexDirection: "column" }}>
                  <h3 className="tech-panel-title">{selectedSubmitProfile.fileTitle}</h3>
                  
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
                          : selectedSubmitProfile.filePrompt}
                    </div>
                    <div style={{ marginTop: "0.5rem", color: "hsl(var(--text-muted))", fontSize: "0.82rem", lineHeight: 1.5 }}>
                      Có thể chọn nhiều file cùng lúc hoặc chọn từng file nhiều lần; hệ thống sẽ tự cộng dồn theo tên file.
                    </div>
                    <input
                      type="file"
                      multiple
                      accept={acceptedFileTypes(selectedAsm)}
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
            <div className="student-history-page">
              <div className="student-history-toolbar">
                <div>
                  <h1>Lịch sử & gợi ý</h1>
                  <p>Bài tập: <strong>{selectedAsm.name}</strong></p>
                </div>
                {selectedSubmission && (
                  <span className={`mock-badge ${
                    selectedSubmission.status === "SUCCESS" ? "success" :
                    selectedSubmission.status === "FAILED" ? "danger" : "warning"
                  }`}>
                    {selectedSubmission.status}
                  </span>
                )}
              </div>
              <div className="history-grid">
                <aside className="submission-list-panel" aria-label="Danh sách lần nộp">
                  <div className="submission-list-header">
                    <h2>Lần nộp</h2>
                    <span>{submissions.length}</span>
                  </div>
                  {isLoadingSubs && <div className="submission-list-state">Đang tải lịch sử...</div>}
                  {!isLoadingSubs && submissions.length === 0 && (
                    <div className="submission-list-state">Chưa có lần nộp nào.</div>
                  )}
                  <div className="submission-list-stack">
                    {submissions.map((sub, idx) => {
                      const submissionIndex = submissions.length - idx;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setSelectedSubmission(sub)}
                          className={`submission-list-item ${selectedSubmission?.id === sub.id ? "selected" : ""}`}
                        >
                          <span>
                            <strong>#{submissionIndex}</strong>
                            {isMounted ? `${new Date(sub.created_at).toLocaleTimeString()} - ${new Date(sub.created_at).toLocaleDateString()}` : ""}
                          </span>
                          <span className={`mock-badge ${sub.status === "SUCCESS" ? "success" : sub.status === "FAILED" ? "danger" : "warning"}`}>
                            {sub.status}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </aside>

                {selectedSubmission ? (
                  <div className="student-history-detail">
                    <section className="student-history-card">
                      <div className="student-card-header">
                        <div>
                          <h3>Kết quả chấm</h3>
                          <p>{isMounted ? new Date(selectedSubmission.created_at).toLocaleString("vi-VN") : ""}</p>
                        </div>
                      </div>

                      <div className="student-result-stats">
                        <div className="student-stat-tile">
                          <span>Trạng thái</span>
                          <strong className={
                            selectedSubmission.status === "SUCCESS" ? "success" :
                            selectedSubmission.status === "FAILED" ? "danger" : "warning"
                          }>
                            {selectedSubmission.status}
                          </strong>
                        </div>
                        {totalCount > 0 && (
                          <div className="student-stat-tile">
                            <span>Testcase đạt</span>
                            <strong>{passedCount}/{totalCount}</strong>
                          </div>
                        )}
                      </div>
                      
                      {selectedSubmission.compile_error && (
                        <div className="code-output student-error-output">
                          <strong>Compile Error</strong><br />
                          {selectedSubmission.compile_error}
                        </div>
                      )}

                      {selectedSubmission.runtime_error && (
                        <div className="code-output student-error-output">
                          <strong>Runtime Error</strong><br />
                          {selectedSubmission.runtime_error}
                        </div>
                      )}

                      {publicRows.length > 0 && (
                        <div className="compact-testcase-section">
                          <div className="compact-section-heading">
                            <h4>Testcase mẫu</h4>
                            {publicTableHasHiddenFailures && (
                              <span className="mock-badge warning">
                                Còn lỗi ẩn
                              </span>
                            )}
                          </div>
                          {renderTestcaseTable(publicRows, { warningBackground: publicTableHasHiddenFailures, compact: "result" })}
                        </div>
                      )}
                    </section>

                    {recommendation && (
                      <section className="student-history-card">
                        <div className="student-card-header">
                          <div>
                            <h3>Gợi ý testcase</h3>
                            <p>{getStatusMessage(recommendation.status)}</p>
                          </div>
                          <span className={`mock-badge ${
                            recommendation.status === "READY" ? "success" :
                            recommendation.status === "FAILED" ? "danger" : "warning"
                          }`}>
                            {recommendation.status}
                          </span>
                        </div>

                        {canShowRecommendationRows && recommendationRows.length > 0 && (
                          <div className="compact-testcase-section">
                            <div className="compact-section-heading">
                              <h4>{recommendation.status === "PREVIOUS_TESTCASE_NOT_COMPLETED" ? "Cần hoàn thành trước" : "Nên thử tiếp"}</h4>
                              <span className="panel-count-pill">{recommendationRows.length} TC</span>
                            </div>
                            {renderTestcaseTable(recommendationRows, { compact: "recommendation" })}
                          </div>
                        )}

                        {canShowFeedbackForm && (
                          <form onSubmit={handleFeedbackSubmit} className="student-feedback-form">
                            <h4>
                              {recommendation.status === "NO_TESTCASE" ? "Khảo sát sau khi chấm bài" : "Khảo sát phản hồi gợi ý"}
                            </h4>
                            
                            <div className="form-group">
                              <label className="form-label">
                                {recommendation.status === "NO_TESTCASE" ? "Mức độ hài lòng" : "Mức độ hữu ích"}
                              </label>
                              <select
                                className="form-control student-rating-select"
                                value={formRating}
                                onChange={(e) => setFormRating(Number(e.target.value))}
                              >
                                <option value="5">5 sao (Rất tốt)</option>
                                <option value="4">4 sao (Tốt)</option>
                                <option value="3">3 sao (Bình thường)</option>
                                <option value="2">2 sao (Kém)</option>
                                <option value="1">1 sao (Rất tệ)</option>
                              </select>
                            </div>

                            <div className="form-group">
                              <label className="form-label">
                                Góp ý thêm
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
                              Gửi phản hồi
                            </button>
                          </form>
                        )}

                        {(recommendation.is_filled_form || formSubmitted) && (
                          <div className="student-feedback-complete">
                            Cảm ơn bạn đã gửi phản hồi.
                          </div>
                        )}
                      </section>
                    )}
                  </div>
                ) : (
                  <div className="student-history-empty">
                    <h2>Chọn một lần nộp</h2>
                    <p>Kết quả chấm và gợi ý testcase sẽ hiện ở đây.</p>
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
