"use client";

import Link from "next/link";
import { useState, useEffect, useRef, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { useRouter } from "next/navigation";

interface Assignment {
  id: string;
  name: string;
  description: string;
  assignment_type?: AssignmentType;
  supported_languages?: string[];
  testcase_samples?: string;
  testcase_generation_strategy?: string;
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

const padDatePart = (value: number) => String(value).padStart(2, "0");

const formatDateTime = (value?: string | null) => {
  const date = new Date(String(value || ""));
  if (!Number.isFinite(date.getTime())) return "";
  return `${padDatePart(date.getDate())}/${padDatePart(date.getMonth() + 1)}/${date.getFullYear()} ${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
};

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
type SubmitMode = "editor" | "file";
type QuestionKind = "CODE" | "TEXT" | "SINGLE_CHOICE";
type TestcaseVisibility = "SAMPLE" | "HIDDEN";
type TestcasePair = {
  input: string;
  expected: string;
  visibility: TestcaseVisibility;
};
type AssignmentQuestion = {
  id: string;
  title: string;
  prompt: string;
  points: number;
  kind: QuestionKind;
  starterCode: string;
  referenceAnswer: string;
  options: string[];
  correctOption: number;
  testcases: TestcasePair[];
};
type StructuredAssignmentConfig = {
  version: 1;
  mode: "QUESTION_SET";
  questions: AssignmentQuestion[];
};
type QuestionAnswers = Record<string, string>;
type TrialResult = {
  status: string;
  scores?: Record<string, boolean> | boolean[] | string | null;
  failed_outputs?: Record<string, {
    expected?: string | null;
    actual?: string | null;
    error?: string | null;
  }> | null;
  compile_error?: string | null;
  runtime_error?: string | null;
  error?: string;
};
type QuestionEditorSize = "compact" | "normal" | "large" | "focus";

const QUESTION_EDITOR_SIZE_OPTIONS: { value: QuestionEditorSize; label: string }[] = [
  { value: "compact", label: "Gọn" },
  { value: "normal", label: "Vừa" },
  { value: "large", label: "Rộng" },
  { value: "focus", label: "Tập trung" },
];
const QUESTION_EDITOR_SIZE_INDEX: Record<QuestionEditorSize, number> = {
  compact: 0,
  normal: 1,
  large: 2,
  focus: 3,
};

const STUDENT_ASSIGNMENT_FLOW: Record<AssignmentType, {
  label: string;
  goal: string;
  workLabel: string;
  workHint: string;
  editorLabel: string;
  editorPlaceholder: string;
  fileHint: string;
  submitLabel: string;
  primaryMaterialLabel: string;
  starterLabel?: string;
  configLabel: string;
  testcaseLabel: string;
}> = {
  STANDARD: {
    label: "Bài lập trình",
    goal: "Đọc đề, viết lời giải bằng ngôn ngữ cho phép và nộp source để chấm testcase.",
    workLabel: "Bạn cần làm gì?",
    workHint: "Viết chương trình giải đúng yêu cầu đề bài. Nên tự chạy với ví dụ trước khi nộp.",
    editorLabel: "Mã nguồn lời giải",
    editorPlaceholder: "// Code ở đây",
    fileHint: "Nộp file source hoặc zip chứa các file cần chấm.",
    submitLabel: "Nộp bài giải",
    primaryMaterialLabel: "Đề bài",
    configLabel: "Cấu hình chấm",
    testcaseLabel: "Testcase mẫu",
  },
  FILL_BLANK: {
    label: "Bài đục lỗ",
    goal: "Hoàn thiện các phần bị khuyết trong template, giữ nguyên phần code có sẵn.",
    workLabel: "Bạn cần điền gì?",
    workHint: "Chỉ sửa/điền các vùng được yêu cầu. Không đổi tên hàm, class hoặc giao diện đã cho nếu đề không cho phép.",
    editorLabel: "Code sau khi điền lỗ trống",
    editorPlaceholder: "// Dán template đã hoàn thiện tại đây",
    fileHint: "Nộp file code đã điền đầy đủ các vùng còn thiếu.",
    submitLabel: "Nộp bản đã điền",
    primaryMaterialLabel: "Yêu cầu bài đục lỗ",
    starterLabel: "Template cần hoàn thiện",
    configLabel: "Quy tắc đục lỗ",
    testcaseLabel: "Testcase kiểm chứng",
  },
  DEBUGGING: {
    label: "Bài sửa lỗi",
    goal: "Sửa code lỗi được giao để chương trình chạy đúng với hành vi mong muốn.",
    workLabel: "Bạn cần sửa gì?",
    workHint: "Tìm bug trong code được giao, sửa tối thiểu cần thiết và giữ nguyên public API nếu đề yêu cầu.",
    editorLabel: "Code sau khi sửa lỗi",
    editorPlaceholder: "// Dán code đã sửa tại đây",
    fileHint: "Nộp file code đã sửa hoặc zip nếu bài có nhiều file.",
    submitLabel: "Nộp bản đã sửa",
    primaryMaterialLabel: "Hành vi đúng cần đạt",
    starterLabel: "Code lỗi được giao",
    configLabel: "Mô tả lỗi cần xử lý",
    testcaseLabel: "Testcase bắt lỗi",
  },
  PROJECT: {
    label: "Mini project",
    goal: "Hoàn thiện project theo brief, rubric và cấu trúc nộp được yêu cầu.",
    workLabel: "Bạn cần bàn giao gì?",
    workHint: "Làm đầy đủ tính năng bắt buộc, giữ cấu trúc thư mục rõ ràng và nộp zip/source theo yêu cầu.",
    editorLabel: "Ghi chú nộp bài / file chính",
    editorPlaceholder: "Ghi chú cách chạy project, file chính, hoặc dán nội dung README nếu cần.",
    fileHint: "Ưu tiên nộp zip chứa toàn bộ project, README và script chạy.",
    submitLabel: "Nộp project",
    primaryMaterialLabel: "Brief dự án",
    starterLabel: "Starter project / cấu trúc gợi ý",
    configLabel: "Rubric chấm điểm",
    testcaseLabel: "Smoke / integration tests",
  },
  QUIZ_CODE: {
    label: "Quiz code",
    goal: "Đọc câu hỏi/snippet code và nộp đáp án hoặc giải thích ngắn.",
    workLabel: "Bạn cần trả lời gì?",
    workHint: "Trả lời đúng trọng tâm câu hỏi. Nếu cần giải thích, ghi ngắn gọn cách suy luận.",
    editorLabel: "Đáp án của bạn",
    editorPlaceholder: "Nhập đáp án và giải thích ngắn tại đây.",
    fileHint: "Quiz thường nộp bằng editor; chỉ đính kèm file nếu đề yêu cầu.",
    submitLabel: "Nộp đáp án",
    primaryMaterialLabel: "Câu hỏi / snippet code",
    configLabel: "Cấu hình quiz",
    testcaseLabel: "Kiểm chứng tùy chọn",
  },
};

const STUDENT_ACTIVE_TAB_KEY = "trs_student_active_tab";
const STUDENT_SELECTED_ASSIGNMENT_KEY = "trs_student_selected_assignment_id";
const STUDENT_SELECTED_SUBMISSION_KEY = "trs_student_selected_submission_id";

const isStudentTab = (value: string | null): value is StudentTab =>
  value === "assignments" || value === "submit" || value === "history";

const PUBLIC_TESTCASE_COUNT = 10;
const getStudentAssignmentFlow = (type?: string) =>
  STUDENT_ASSIGNMENT_FLOW[(type as AssignmentType) || "STANDARD"] || STUDENT_ASSIGNMENT_FLOW.STANDARD;

const languageLabel = (values?: string[]) => {
  if (!values || values.length === 0) return "Theo yêu cầu bài";
  const labels: Record<string, string> = {
    c: "C",
    cpp: "C++",
    java: "Java",
    python: "Python",
    javascript: "JavaScript",
    typescript: "TypeScript",
    go: "Go",
    rust: "Rust",
  };
  return values.map((value) => labels[value] || value).join(", ");
};

const sourceFileNameForAssignment = (assignment?: Assignment | null) => {
  if (!assignment) return "solution.c";
  if (assignment.assignment_type === "QUIZ_CODE") return "answer.txt";
  if (assignment.assignment_type === "PROJECT") return "README.md";
  const languages = assignment.supported_languages || [];
  if (languages.includes("c")) return "solution.c";
  if (languages.includes("cpp")) return "solution.cpp";
  if (languages.includes("java")) return "Main.java";
  if (languages.includes("python")) return "solution.py";
  if (languages.includes("javascript")) return "solution.js";
  if (languages.includes("typescript")) return "solution.ts";
  return "solution.c";
};

const contentPreview = (value?: string, fallback = "Chưa có nội dung.") =>
  value && value.trim() ? value : fallback;

const isDefaultQuestionPrompt = (value?: string) =>
  ["viết lời giải cho yêu cầu dưới đây.", "viết lời giải cho yêu cầu dưới đây"].includes(String(value || "").trim().toLowerCase());

const normalizeTestcasePair = (item: Partial<TestcasePair> | undefined): TestcasePair => {
  const visibility = item?.visibility === "HIDDEN" ? "HIDDEN" : "SAMPLE";
  return {
    input: String(item?.input || ""),
    expected: String(item?.expected || ""),
    visibility,
  };
};

const parseTestcasePairs = (value?: string): TestcasePair[] => {
  if (!value || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => normalizeTestcasePair({
          input: String(item?.input ?? "").trim(),
          expected: String(item?.expected ?? item?.output ?? "").trim(),
          visibility: item?.visibility === "HIDDEN" ? "HIDDEN" : "SAMPLE",
        }))
        .filter((item) => item.input || item.expected);
    }
  } catch {
    // Support old plain text testcase samples.
  }
  return value.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s*(?:->|=>|\|)\s*/);
      return { input: parts[0] || "", expected: parts.slice(1).join(" "), visibility: "SAMPLE" };
    });
};

const normalizeQuestion = (item: Partial<AssignmentQuestion>, index: number): AssignmentQuestion => ({
  id: String(item.id || `q-${index + 1}`),
  title: String(item.title || `Câu ${index + 1}`),
  prompt: String(item.prompt || ""),
  points: Number(item.points) || 1,
  kind: (item.kind === "TEXT" || item.kind === "SINGLE_CHOICE" || item.kind === "CODE") ? item.kind : "CODE",
  starterCode: String(item.starterCode || ""),
  referenceAnswer: String(item.referenceAnswer || ""),
  options: Array.from({ length: 4 }, (_, optionIndex) => String(item.options?.[optionIndex] || "")),
  correctOption: Math.min(3, Math.max(0, Number(item.correctOption) || 0)),
  testcases: Array.isArray(item.testcases)
    ? item.testcases.map((pair) => normalizeTestcasePair(pair))
    : [],
});

const parseQuestionConfig = (assignment?: Assignment | null): AssignmentQuestion[] => {
  if (!assignment?.type_config) return [];
  try {
    const parsed = JSON.parse(assignment.type_config) as Partial<StructuredAssignmentConfig> | Partial<AssignmentQuestion>[];
    const questions = Array.isArray(parsed) ? parsed : parsed.questions;
    if (Array.isArray(questions)) {
      return questions.map(normalizeQuestion).filter((question) => question.prompt.trim() || question.title.trim());
    }
  } catch {
    return [];
  }
  return [];
};

const buildQuestionAnswerFile = (questions: AssignmentQuestion[], answers: QuestionAnswers) =>
  questions.map((question, index) => {
    const answer = answers[question.id] || "";
    return [
      `# ${index + 1}. ${question.title}`,
      question.kind === "SINGLE_CHOICE" ? `Selected: ${answer || "Chưa chọn"}` : answer,
    ].join("\n");
  }).join("\n\n");

const buildStudentStarter = (assignment?: Assignment | null) => {
  if (!assignment?.starter_code) return "";
  if (assignment.assignment_type === "FILL_BLANK") {
    return assignment.starter_code.replace(
      /\/\*\s*HOLE:start\s*\*\/[\s\S]*?\/\*\s*HOLE:end\s*\*\//g,
      "/* TODO: Hoàn thiện phần code còn thiếu tại đây. */"
    );
  }
  return assignment.starter_code;
};

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

const SIDEBAR_WIDTH_STORAGE_KEY = "trs.sidebarWidth";
const DEFAULT_SIDEBAR_WIDTH = 268;
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 460;

const clampSidebarWidth = (width: number) => Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));

export default function StudentDashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<StudentTab>("assignments");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [assignmentQuery, setAssignmentQuery] = useState("");
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");
  
  // Data States
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAsm, setSelectedAsm] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  
  // Code Editor states
  const [editorFile, setEditorFile] = useState("solution.c");
  const [editorContent, setEditorContent] = useState(
    '#include <stdio.h>\n\nint main(void) {\n  // Code ở đây\n  return 0;\n}\n'
  );
  
  // Drag & Drop States
  const [solutionFiles, setSolutionFiles] = useState<File[]>([]);
  const [encodedSolutionFiles, setEncodedSolutionFiles] = useState<EncodedSubmissionFile[]>([]);
  const [isEncodingFiles, setIsEncodingFiles] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitMode, setSubmitMode] = useState<SubmitMode>("editor");
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [questionAnswers, setQuestionAnswers] = useState<QuestionAnswers>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [questionEditorSize, setQuestionEditorSize] = useState<QuestionEditorSize>("normal");
  const [questionCodeScrollTop, setQuestionCodeScrollTop] = useState(0);
  const [questionTrialResults, setQuestionTrialResults] = useState<Record<string, TrialResult>>({});
  const [runningTrialQuestionId, setRunningTrialQuestionId] = useState<string | null>(null);
  const [isReviewingSubmittedWork, setIsReviewingSubmittedWork] = useState(false);

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
      router.push("/login");
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
    if (!selectedAsm) return;
    const flow = getStudentAssignmentFlow(selectedAsm.assignment_type);
    const questions = parseQuestionConfig(selectedAsm);
    setEditorFile(sourceFileNameForAssignment(selectedAsm));
    setEditorContent(questions[0]?.starterCode || buildStudentStarter(selectedAsm) || `${flow.editorPlaceholder}\n`);
    setSubmitMode(selectedAsm.assignment_type === "PROJECT" ? "file" : "editor");
    setActiveQuestionIndex(0);
    setQuestionAnswers(Object.fromEntries(
      questions
        .filter((question) => question.kind !== "SINGLE_CHOICE" && question.starterCode)
        .map((question) => [question.id, question.starterCode])
    ));
    setFlaggedQuestions({});
    setQuestionTrialResults({});
    setRunningTrialQuestionId(null);
    setQuestionEditorSize("normal");
    clearSelectedFiles();
  }, [selectedAsm?.id]);

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
    if (selectedSubmission) {
      fetchRecommendation(selectedSubmission.id);
      setFormSubmitted(selectedSubmission.status === 'SUCCESS' ? false : true); // Reset feedback states
      setFormFeedback("");
    }
  }, [selectedSubmission]);

  useEffect(() => {
    setQuestionCodeScrollTop(0);
  }, [activeQuestionIndex]);

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
        if (selectedQuestions.length > 0) {
          const firstUnanswered = selectedQuestions.findIndex((question) => !isQuestionAnswered(question));
          if (firstUnanswered >= 0) {
            setActiveQuestionIndex(firstUnanswered);
            setSubmitError(`Bạn còn câu ${firstUnanswered + 1} chưa trả lời.`);
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
              files: [
                {
                  filename: "answers.json",
                  content: JSON.stringify({
                    assignment_id: selectedAsm.id,
                    answers: selectedQuestions.map((question, index) => ({
                      question: index + 1,
                      question_id: question.id,
                      title: question.title,
                      kind: question.kind,
                      answer: questionAnswers[question.id] || "",
                    })),
                  }, null, 2),
                }
              ]
            })
          });
        } else {
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
        }
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
        setIsReviewingSubmittedWork(false);
        setSolutionFiles([]);
        setEncodedSolutionFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        
        await fetchSubmissions(selectedAsm.id, { preferNewest: true });
        if (selectedQuestions.length === 0) {
          setActiveTab("history");
        }
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

  const handleRunQuestionTrial = async (question: AssignmentQuestion, questionIndex: number) => {
    const token = localStorage.getItem("trs_token");
    if (!token || !selectedAsm || runningTrialQuestionId) return;

    const answer = questionAnswers[question.id] ?? question.starterCode;
    if (!answer.trim() || (question.starterCode && answer.trim() === question.starterCode.trim())) {
      setQuestionTrialResults((current) => ({
        ...current,
        [question.id]: { status: "FAILED", error: "Bạn cần nhập hoặc sửa lời giải trước khi chạy thử." },
      }));
      return;
    }
    if (question.testcases.length === 0) {
      setQuestionTrialResults((current) => ({
        ...current,
        [question.id]: { status: "FAILED", error: "Câu này chưa có testcase mẫu để chạy thử." },
      }));
      return;
    }

    setRunningTrialQuestionId(question.id);
    setQuestionTrialResults((current) => {
      const next = { ...current };
      delete next[question.id];
      return next;
    });

    try {
      const response = await fetch("/api/submissions/trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignment_id: selectedAsm.id,
          question: questionIndex + 1,
          answer,
          testcases: question.testcases,
        }),
      });
      const data = await response.json().catch(() => ({ status: "FAILED", error: "Không đọc được phản hồi từ grader." }));
      setQuestionTrialResults((current) => ({
        ...current,
        [question.id]: response.ok ? data : { status: "FAILED", error: data.error || "Không chạy thử được testcase." },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không rõ nguyên nhân";
      setQuestionTrialResults((current) => ({
        ...current,
        [question.id]: { status: "FAILED", error: `Không kết nối được grader: ${message}` },
      }));
    } finally {
      setRunningTrialQuestionId(null);
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

  useEffect(() => {
    const storedWidth = Number(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
    if (Number.isFinite(storedWidth) && storedWidth > 0) {
      setSidebarWidth(clampSidebarWidth(storedWidth));
    }
  }, []);

  const handleSidebarResizeStart = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (window.innerWidth <= 900) return;
    event.preventDefault();
    event.stopPropagation();
    setIsSidebarCollapsed(false);

    const startX = event.clientX;
    const startWidth = sidebarWidth;
    let nextWidth = startWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      nextWidth = clampSidebarWidth(startWidth + moveEvent.clientX - startX);
      setSidebarWidth(nextWidth);
    };

    const handleMouseUp = () => {
      localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(nextWidth));
      document.body.classList.remove("is-sidebar-resizing");
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    document.body.classList.add("is-sidebar-resizing");
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const resetSidebarWidth = () => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(DEFAULT_SIDEBAR_WIDTH));
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

    const dateLabel = isMounted ? formatDateTime(assignment.end_date) : "";
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
  const filteredAssignments = assignments.filter((assignment) => {
    const status = getAssignmentStatus(assignment);
    const matchesStatus = assignmentStatusFilter === "ALL" || status === assignmentStatusFilter;
    const searchableText = [
      assignment.name,
      assignment.description,
      assignment.author_name,
      getStudentAssignmentFlow(assignment.assignment_type).label,
      assignment.id,
    ].join(" ").toLowerCase();

    return matchesStatus && (!assignmentSearchTerm || searchableText.includes(assignmentSearchTerm));
  });
  const openAssignmentCount = assignments.filter((assignment) => getAssignmentStatus(assignment) === "OPEN").length;
  const closedAssignmentCount = assignments.length - openAssignmentCount;
  const selectedFlow = getStudentAssignmentFlow(selectedAsm?.assignment_type);
  const selectedQuestions = parseQuestionConfig(selectedAsm);
  const activeQuestion = selectedQuestions[activeQuestionIndex] || selectedQuestions[0] || null;
  const activeQuestionAnswer = activeQuestion ? (questionAnswers[activeQuestion.id] ?? activeQuestion.starterCode) : "";
  const activeQuestionLineCount = Math.max(1, activeQuestionAnswer.split(/\r\n|\r|\n/).length);
  const isQuestionAnswered = (question: AssignmentQuestion) => {
    const answer = (questionAnswers[question.id] || "").trim();
    if (!answer) return false;
    if (question.kind !== "SINGLE_CHOICE" && question.starterCode && answer === question.starterCode.trim()) {
      return false;
    }
    return true;
  };
  const answeredQuestionCount = selectedQuestions.filter(isQuestionAnswered).length;
  const totalQuestionCount = selectedQuestions.length;
  const questionProgressPercent = totalQuestionCount > 0 ? Math.round((answeredQuestionCount / totalQuestionCount) * 100) : 0;
  const hasQuestionIssue = (question: AssignmentQuestion) => {
    const result = questionTrialResults[question.id];
    if (!result) return false;
    const scoreEntries = normalizeScores(result.scores ?? null);
    return Boolean(
      result.error
      || result.compile_error
      || result.runtime_error
      || result.status === "FAILED"
      || scoreEntries.some((score) => !score.passed)
    );
  };
  const goToRelativeQuestion = (offset: number) => {
    if (totalQuestionCount === 0) return;
    setActiveQuestionIndex((current) => Math.min(totalQuestionCount - 1, Math.max(0, current + offset)));
  };
  const handleReviewSubmittedWork = () => {
    setIsReviewingSubmittedWork(true);
    setSubmitSuccess(false);
  };
  const handleRetakeQuestionAssignment = () => {
    setIsReviewingSubmittedWork(false);
    setSubmitSuccess(false);
    setSubmitError("");
    setActiveQuestionIndex(0);
    setQuestionAnswers({});
    setFlaggedQuestions({});
    setQuestionTrialResults({});
    setRunningTrialQuestionId(null);
    setQuestionEditorSize("normal");
  };
  const selectedAcceptedFiles = selectedAsm?.assignment_type === "PROJECT"
    ? ".zip,.cpp,.c,.h,.hpp,.java,.py,.js,.ts,.md,.txt"
    : selectedAsm?.assignment_type === "QUIZ_CODE"
      ? ".txt,.md,.cpp,.c,.java,.py,.js,.ts"
      : ".cpp,.c,.h,.hpp,.java,.py,.js,.ts,.zip";

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
  const totalQuestionPoints = selectedQuestions.reduce((sum, question) => sum + (Number(question.points) || 0), 0);
  const maxPointDisplay = totalQuestionPoints > 0 ? totalQuestionPoints : 10;
  const earnedPointValue = selectedSubmission
    ? totalCount > 0
      ? (passedCount / totalCount) * maxPointDisplay
      : selectedSubmission.status === "SUCCESS"
        ? maxPointDisplay
        : 0
    : 0;
  const earnedPointDisplay = Number.isInteger(earnedPointValue)
    ? String(earnedPointValue)
    : earnedPointValue.toFixed(2);
  const maxPointText = Number.isInteger(maxPointDisplay) ? String(maxPointDisplay) : maxPointDisplay.toFixed(2);
  const submittedAtText = selectedSubmission && isMounted
    ? formatDateTime(selectedSubmission.created_at)
    : "";
  const submissionStatusText = selectedSubmission
    ? selectedSubmission.status === "SUCCESS"
      ? "Đã xong"
      : selectedSubmission.status === "FAILED"
        ? "Có lỗi"
        : selectedSubmission.status === "PENDING" || selectedSubmission.status === "GRADING"
          ? "Đang chấm"
          : selectedSubmission.status
    : "Chưa nộp";
  const submissionStatusClass = selectedSubmission?.status === "SUCCESS"
    ? "success"
    : selectedSubmission?.status === "FAILED"
      ? "danger"
      : selectedSubmission
        ? "warning"
        : "neutral";
  const showQuestionCompletionView = selectedQuestions.length > 0 && submitSuccess && !!selectedSubmission && !isReviewingSubmittedWork;
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

  const renderTrialResult = (question: AssignmentQuestion) => {
    const result = questionTrialResults[question.id];
    if (!result) return null;
    const scoreEntries = normalizeScores(result.scores ?? null);
    const failedOutputs = result.failed_outputs || null;
    const passedCount = scoreEntries.filter((score) => score.passed).length;
    const totalCount = scoreEntries.length;

    return (
      <div className="student-trial-result">
        <div className="compact-section-heading">
          <h4>Kết quả chạy thử</h4>
          {totalCount > 0 && (
            <span className={`mock-badge ${passedCount === totalCount ? "success" : "danger"}`}>
              {passedCount}/{totalCount}
            </span>
          )}
        </div>
        {result.error && <div className="student-question-error">{result.error}</div>}
        {result.compile_error && (
          <div className="student-question-error">
            <strong>Compile Error</strong>
            <pre>{result.compile_error}</pre>
          </div>
        )}
        {result.runtime_error && (
          <div className="student-question-error">
            <strong>Runtime Error</strong>
            <pre>{result.runtime_error}</pre>
          </div>
        )}
        {scoreEntries.length > 0 && (
          <div className="student-testcase-table-wrap">
            <table className="mock-table student-trial-table">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Expected</th>
                  <th>Got</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {scoreEntries.map((score, index) => {
                  const testcase = question.testcases[index] || normalizeTestcasePair(undefined);
                  const failure = failedOutputs?.[String(score.id)];
                  return (
                    <tr key={`${question.id}-trial-${score.id}`}>
                      <td><pre>{testcase.input || "Không có input"}</pre></td>
                      <td><pre>{failure?.expected || testcase.expected || "Không có expected"}</pre></td>
                      <td><pre>{failure?.actual || failure?.error || (score.passed ? testcase.expected || "Khớp" : "N/A")}</pre></td>
                      <td>
                        <span className={`mock-badge ${score.passed ? "success" : "danger"}`}>
                          {score.passed ? "Đúng" : "Sai"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
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
        <aside
          className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}
          style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
        >
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
            <button className={`sidebar-link ${activeTab === "assignments" ? "active" : ""}`} onClick={() => setActiveTab("assignments")} title="Bài tập lớn của tôi">
              <span className="sidebar-icon assignment" aria-hidden="true"></span>
              <span className="sidebar-label">Bài tập lớn của tôi</span>
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
          <button
            type="button"
            className="sidebar-resize-handle"
            aria-label="Kéo để đổi chiều rộng menu"
            title="Kéo để đổi chiều rộng menu"
            onMouseDown={handleSidebarResizeStart}
            onDoubleClick={resetSidebarWidth}
          />
        </aside>

        {/* Main Content */}
        <main className="content-area">
          {activeTab === "assignments" && (
            <div className="student-assignment-page">
              <div className="student-assignment-toolbar">
                <div>
                  <span className="student-assignment-eyebrow">Không gian học tập</span>
                  <h1>Bài tập lớn của tôi</h1>
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
                  <p style={{ color: "hsl(var(--text-muted))" }}>Bạn chưa được đăng ký vào bài tập lớn nào.</p>
                </div>
              )}

              {!isLoadingAsms && assignments.length > 0 && (
                <div className="student-assignment-workspace">
                  <section className="student-assignment-list-panel" aria-label="Danh sách bài tập lớn tham gia">
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
                            onClick={() => {
                              setSelectedAsm(asm);
                              setSubmitSuccess(false);
                              setIsReviewingSubmittedWork(false);
                            }}
                          >
                            <span className="student-assignment-row-main">
                              <strong>{asm.name}</strong>
                            </span>
                            <span className={`student-assignment-row-state ${status.toLowerCase()}`}>
                              {dueInfo.helper}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="student-assignment-detail-card" aria-label="Chi tiết bài tập lớn đang chọn">
                    {selectedAsm ? (
                      (() => {
                        const selectedStatus = getAssignmentStatus(selectedAsm);
                        const selectedDueInfo = getAssignmentDueInfo(selectedAsm);
                        const selectedFlow = getStudentAssignmentFlow(selectedAsm.assignment_type);
                        return (
                      <div className="student-assignment-detail-inner">
                        <div className="student-assignment-detail-kicker">
                          <span className={`student-assignment-row-state ${selectedStatus.toLowerCase()}`}>
                            {selectedStatus === "OPEN" ? "Đang nhận bài" : "Đã đóng"}
                          </span>
                          <code>{selectedFlow.label}</code>
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
                          <div>
                            <span>Ngôn ngữ</span>
                            <strong>{languageLabel(selectedAsm.supported_languages)}</strong>
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

          {activeTab === "submit" && selectedAsm && (
            <div className="student-submit-page">
              <div className="student-submit-toolbar">
                <h1>{selectedFlow.submitLabel}</h1>
              </div>

              {showQuestionCompletionView ? (
                <section className="student-completion-page">
                  <div className="student-completion-title">
                    <span>{selectedAsm.name}</span>
                    <h2>Tổng quan lần làm bài trước của bạn</h2>
                  </div>

                  <div className="student-attempt-table large" role="table" aria-label="Tổng quan lần làm bài">
                    <div className="student-attempt-row header" role="row">
                      <span role="columnheader">Trạng thái</span>
                      <span role="columnheader">Điểm đạt được</span>
                      <span role="columnheader">Testcase</span>
                      <span role="columnheader">Xem lại</span>
                    </div>
                    <div className="student-attempt-row" role="row">
                      <div role="cell">
                        <strong>{submissionStatusText}</strong>
                        <p>{selectedSubmission ? `Đã nộp ${submittedAtText}` : "Chưa có lần nộp nào."}</p>
                      </div>
                      <div role="cell">
                        <strong>{earnedPointDisplay}/{maxPointText}</strong>
                        <p>Điểm tạm tính theo testcase đã vượt qua.</p>
                      </div>
                      <div role="cell">
                        <strong>{totalCount > 0 ? `${passedCount}/${totalCount}` : "--"}</strong>
                        <p>{totalCount > 0 ? `${Math.round((passedCount / totalCount) * 100)}% testcase đúng` : "Chưa có dữ liệu chấm."}</p>
                      </div>
                      <div role="cell">
                        <span className={`mock-badge ${submissionStatusClass}`}>{selectedSubmission?.status || "Chưa nộp"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="student-completion-actions">
                    <button type="button" className="btn btn-primary" onClick={handleReviewSubmittedWork}>
                      Xem lại bài đã nộp
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={handleRetakeQuestionAssignment}>
                      Làm lại lần nữa
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setActiveTab("assignments")}>
                      Quay lại danh sách bài
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setActiveTab("history")}>
                      Xem lịch sử đầy đủ
                    </button>
                  </div>

                  {publicRows.length > 0 && (
                    <details className="student-attempt-details" open>
                      <summary>
                        <span>Chi tiết testcase đã chấm</span>
                        <strong>{passedCount}/{totalCount}</strong>
                      </summary>
                      {publicTableHasHiddenFailures && <span className="mock-badge warning">Còn lỗi ẩn</span>}
                      {renderTestcaseTable(publicRows, { warningBackground: publicTableHasHiddenFailures, compact: "result" })}
                    </details>
                  )}

                  {recommendation && (
                    <details className="student-attempt-details">
                      <summary>
                        <span>Gợi ý testcase</span>
                        <strong>{recommendation.status}</strong>
                      </summary>
                      <p>{getStatusMessage(recommendation.status)}</p>
                      {canShowRecommendationRows && recommendationRows.length > 0 && (
                        <>
                          <div className="compact-section-heading subtle">
                            <h4>{recommendation.status === "PREVIOUS_TESTCASE_NOT_COMPLETED" ? "Cần hoàn thành trước" : "Nên thử tiếp"}</h4>
                            <span className="panel-count-pill">{recommendationRows.length} TC</span>
                          </div>
                          {renderTestcaseTable(recommendationRows, { compact: "recommendation" })}
                        </>
                      )}
                    </details>
                  )}
                </section>
              ) : selectedQuestions.length > 0 ? (
              <div className="student-question-workspace">
                {isReviewingSubmittedWork && selectedSubmission && (
                  <section className="student-completion-page review-anchor">
                    <div className="student-completion-title">
                      <span>{selectedAsm.name}</span>
                      <h2>Tổng quan lần làm bài trước của bạn</h2>
                    </div>

                    <div className="student-attempt-table large" role="table" aria-label="Tổng quan lần làm bài">
                      <div className="student-attempt-row header" role="row">
                        <span role="columnheader">Trạng thái</span>
                        <span role="columnheader">Điểm đạt được</span>
                        <span role="columnheader">Testcase</span>
                        <span role="columnheader">Xem lại</span>
                      </div>
                      <div className="student-attempt-row" role="row">
                        <div role="cell">
                          <strong>{submissionStatusText}</strong>
                          <p>{`Đã nộp ${submittedAtText || "đang cập nhật"}`}</p>
                        </div>
                        <div role="cell">
                          <strong>{earnedPointDisplay}/{maxPointText}</strong>
                          <p>Điểm tạm tính theo testcase đã vượt qua.</p>
                        </div>
                        <div role="cell">
                          <strong>{totalCount > 0 ? `${passedCount}/${totalCount}` : "--"}</strong>
                          <p>{totalCount > 0 ? `${Math.round((passedCount / totalCount) * 100)}% testcase đúng` : "Chưa có dữ liệu chấm."}</p>
                        </div>
                        <div role="cell">
                          <span className={`mock-badge ${submissionStatusClass}`}>{selectedSubmission.status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="student-completion-actions">
                      <button type="button" className="btn btn-primary" onClick={() => {
                        setSubmitSuccess(true);
                        setIsReviewingSubmittedWork(false);
                      }}>
                        Quay lại bảng kết quả
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={handleRetakeQuestionAssignment}>
                        Làm lại lần nữa
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => setActiveTab("history")}>
                        Xem lịch sử đầy đủ
                      </button>
                    </div>
                  </section>
                )}
                {activeQuestion && (
                  <div className="student-question-number-panel">
                    <div className="student-question-number-header">
                      <div>
                        <span>{selectedFlow.label}</span>
                        <strong>{answeredQuestionCount}/{totalQuestionCount}</strong>
                      </div>
                      <div className="student-question-number-actions">
                        {isReviewingSubmittedWork ? (
                          <div className="student-review-actions compact">
                            <button type="button" className="btn btn-primary" onClick={() => {
                              setSubmitSuccess(true);
                              setIsReviewingSubmittedWork(false);
                            }}>
                              Quay lại kết quả
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={handleRetakeQuestionAssignment}>
                              Làm lại
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-primary student-question-submit-button"
                            onClick={() => handleSubmitSolution("editor")}
                            disabled={isSubmitting || answeredQuestionCount < totalQuestionCount}
                          >
                            {isSubmitting ? "Đang gửi..." : selectedFlow.submitLabel}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="student-question-progress">
                      <div>
                        <span style={{ width: `${questionProgressPercent}%` }}></span>
                      </div>
                    </div>
                    <div className="student-question-number-grid" aria-label="Chọn câu hỏi">
                      {selectedQuestions.map((question, index) => {
                        const answered = isQuestionAnswered(question);
                        const flagged = Boolean(flaggedQuestions[question.id]);
                        const hasIssue = hasQuestionIssue(question);
                        return (
                          <button
                            key={question.id}
                            type="button"
                            className={`${index === activeQuestionIndex ? "active" : ""} ${answered ? "answered" : ""} ${flagged ? "flagged" : ""} ${hasIssue ? "error" : ""}`}
                            onClick={() => setActiveQuestionIndex(index)}
                            title={`Câu ${index + 1}${hasIssue ? " - có lỗi" : answered ? " - đã làm" : " - chưa làm"}${flagged ? " - đã cắm cờ" : ""}`}
                          >
                            {index + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <section className="student-question-main">
                  {activeQuestion && (
                    <>
                      <div className="student-question-paper">
                        <div className="student-question-title-row">
                          <div>
                            {activeQuestion.title.trim().toLowerCase() !== `câu ${activeQuestionIndex + 1}` && (
                              <span>Câu {activeQuestionIndex + 1}</span>
                            )}
                            <h2>{activeQuestion.title}</h2>
                          </div>
                          <div className="student-question-title-actions">
                            <button
                              type="button"
                              className={`flag-current-button ${flaggedQuestions[activeQuestion.id] ? "active" : ""}`}
                              onClick={() => setFlaggedQuestions((current) => ({
                                ...current,
                                [activeQuestion.id]: !current[activeQuestion.id],
                              }))}
                            >
                              {flaggedQuestions[activeQuestion.id] ? "Bỏ cờ" : "Cắm cờ"}
                            </button>
                          </div>
                        </div>
                        {!isDefaultQuestionPrompt(activeQuestion.prompt) && <p>{activeQuestion.prompt}</p>}
                        {activeQuestion.starterCode && activeQuestion.kind !== "SINGLE_CHOICE" && (
                          <pre>{activeQuestion.starterCode}</pre>
                        )}
                        {activeQuestion.testcases.length > 0 && (
                          <div className="student-question-testcases">
                            <table>
                              <thead>
                                <tr>
                                  <th>Input</th>
                                  <th>Expected</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeQuestion.testcases.map((pair, index) => (
                                  <tr key={`${activeQuestion.id}-sample-${index}`}>
                                    <td><pre>{pair.input || "Không có input"}</pre></td>
                                    <td><pre>{pair.expected || "Chưa có expected"}</pre></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      <div className={`student-question-answer-panel size-${questionEditorSize}`}>
                        <div className="student-question-answer">
                          <div className="student-question-answer-header">
                            <div>
                              <strong>Bài làm</strong>
                            </div>
                            <div className="student-question-answer-actions">
                              {activeQuestion.kind !== "SINGLE_CHOICE" && (
                                <div className="editor-size-control" aria-label="Chọn kích thước editor">
                                  <span>Cỡ khung</span>
                                  <div className="editor-size-slider-wrap">
                                    <input
                                      type="range"
                                      min={0}
                                      max={QUESTION_EDITOR_SIZE_OPTIONS.length - 1}
                                      step={1}
                                      value={QUESTION_EDITOR_SIZE_INDEX[questionEditorSize]}
                                      onChange={(e) => setQuestionEditorSize(QUESTION_EDITOR_SIZE_OPTIONS[Number(e.target.value)].value)}
                                    />
                                    <div className="editor-size-ticks" aria-hidden="true">
                                      {QUESTION_EDITOR_SIZE_OPTIONS.map((option) => (
                                        <i key={option.value} className={questionEditorSize === option.value ? "active" : ""} />
                                      ))}
                                    </div>
                                  </div>
                                  <strong>{QUESTION_EDITOR_SIZE_OPTIONS[QUESTION_EDITOR_SIZE_INDEX[questionEditorSize]].label}</strong>
                                </div>
                              )}
                              <span className={isQuestionAnswered(activeQuestion) ? "answer-state done" : "answer-state"}>
                                {isQuestionAnswered(activeQuestion) ? "Đã làm" : "Chưa làm"}
                              </span>
                            </div>
                          </div>
                          {activeQuestion.kind === "SINGLE_CHOICE" ? (
                            <div className="student-choice-list">
                              {activeQuestion.options.map((option, optionIndex) => {
                                const value = String.fromCharCode(65 + optionIndex);
                                return (
                                  <label key={`${activeQuestion.id}-answer-${optionIndex}`} className={questionAnswers[activeQuestion.id] === value ? "selected" : ""}>
                                    <input
                                      type="radio"
                                      name={`answer-${activeQuestion.id}`}
                                      checked={questionAnswers[activeQuestion.id] === value}
                                      disabled={isReviewingSubmittedWork}
                                      onChange={() => setQuestionAnswers((current) => ({ ...current, [activeQuestion.id]: value }))}
                                    />
                                    <span>{value}</span>
                                    <strong>{option || `Đáp án ${value}`}</strong>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <div className={`student-code-editor-shell ${questionEditorSize}`}>
                              <div className="student-code-line-gutter" aria-hidden="true">
                                <div style={{ transform: `translateY(-${questionCodeScrollTop}px)` }}>
                                  {Array.from({ length: activeQuestionLineCount }, (_, lineIndex) => (
                                    <span key={`line-${lineIndex + 1}`}>{lineIndex + 1}</span>
                                  ))}
                                </div>
                              </div>
                              <textarea
                                className={`form-control student-question-code ${questionEditorSize}`}
                                value={activeQuestionAnswer}
                                readOnly={isReviewingSubmittedWork}
                                onScroll={(e) => setQuestionCodeScrollTop(e.currentTarget.scrollTop)}
                                onChange={(e) => setQuestionAnswers((current) => ({ ...current, [activeQuestion.id]: e.target.value }))}
                                placeholder={selectedFlow.editorPlaceholder}
                              />
                            </div>
                          )}
                          {activeQuestion.kind !== "SINGLE_CHOICE" && (
                            <div className="student-question-trial-row">
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => handleRunQuestionTrial(activeQuestion, activeQuestionIndex)}
                                disabled={isReviewingSubmittedWork || runningTrialQuestionId === activeQuestion.id || activeQuestion.testcases.length === 0}
                              >
                                {runningTrialQuestionId === activeQuestion.id ? "Đang biên dịch..." : "Biên dịch & chạy thử"}
                              </button>
                            </div>
                          )}
                          <div className="student-question-navigation-row">
                            <button type="button" className="btn btn-secondary" onClick={() => goToRelativeQuestion(-1)} disabled={activeQuestionIndex === 0}>
                              Câu trước
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => goToRelativeQuestion(1)} disabled={activeQuestionIndex >= totalQuestionCount - 1}>
                              Câu sau
                            </button>
                          </div>
                          {renderTrialResult(activeQuestion)}
                        </div>
                      </div>
                    </>
                  )}
                </section>
              </div>
              ) : (
              <div className="student-submit-workspace">
                <aside className="student-submit-material-panel">
                  <div className="student-submit-panel-header">
                    <span>{selectedFlow.label}</span>
                    <strong>Đề bài & dữ liệu được giao</strong>
                    <p>{selectedFlow.workHint}</p>
                  </div>

                  <section>
                    <span>{selectedFlow.primaryMaterialLabel}</span>
                    <pre>{contentPreview(selectedAsm.problem_statement || selectedAsm.description)}</pre>
                  </section>
                  {selectedFlow.starterLabel && (
                    <section>
                      <span>{selectedFlow.starterLabel}</span>
                      <pre>{contentPreview(buildStudentStarter(selectedAsm), "Giảng viên chưa cung cấp starter/template.")}</pre>
                    </section>
                  )}
                  <section>
                    <span>{selectedFlow.configLabel}</span>
                    <pre>{contentPreview(selectedAsm.type_config, "Không có cấu hình riêng.")}</pre>
                  </section>
                  {selectedAsm.testcase_samples && (
                    <section>
                      <span>{selectedFlow.testcaseLabel}</span>
                      <div className="student-testcase-pairs">
                        {parseTestcasePairs(selectedAsm.testcase_samples).map((pair, index) => (
                          <div key={`student-testcase-${index}`}>
                            <code>{pair.input || "Không có input"}</code>
                            <strong>{pair.expected || "Chưa có expected output"}</strong>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </aside>

                <section className="student-submit-work-panel">
                  <div className="student-submit-steps">
                    <div>
                      <span>1</span>
                      <strong>Đọc đề</strong>
                    </div>
                    <div>
                      <span>2</span>
                      <strong>Làm bài</strong>
                    </div>
                    <div>
                      <span>3</span>
                      <strong>Nộp & xem lịch sử</strong>
                    </div>
                  </div>

                  <div className="student-submit-choice">
                    <div>
                      <strong>Làm trực tiếp hoặc nộp file</strong>
                      <p>{selectedAsm.assignment_type === "PROJECT" ? "Với project, nên nộp zip đầy đủ. Editor chỉ dùng cho README hoặc ghi chú nộp bài." : "Dùng editor nếu bài chỉ có một file; dùng file đính kèm nếu bài có nhiều file hoặc cần nộp zip."}</p>
                    </div>
                    <div className="submit-mode-toggle" role="tablist" aria-label="Chọn cách nộp bài">
                      <button
                        type="button"
                        className={submitMode === "editor" ? "active" : ""}
                        onClick={() => setSubmitMode("editor")}
                      >
                        Editor
                      </button>
                      <button
                        type="button"
                        className={submitMode === "file" ? "active" : ""}
                        onClick={() => setSubmitMode("file")}
                      >
                        File đính kèm
                      </button>
                    </div>
                  </div>

                  <div className="submit-mode-panel">
                    {submitMode === "editor" && (
                      <div className="student-submit-method">
                        <div className="student-submit-method-header">
                          <span>Phương án 1</span>
                          <h3>Làm trực tiếp trong editor</h3>
                        </div>
                        <div className="student-submit-method-body">
                          <label className="student-submit-field">
                            <span>Tên tệp nộp</span>
                            <input
                              type="text"
                              className="form-control"
                              value={editorFile}
                              onChange={(e) => setEditorFile(e.target.value)}
                            />
                          </label>
                          <label className="student-submit-field fill">
                            <span>{selectedFlow.editorLabel}</span>
                            <textarea
                              className="form-control student-submit-editor"
                              value={editorContent}
                              onChange={(e) => setEditorContent(e.target.value)}
                              placeholder={selectedFlow.editorPlaceholder}
                            />
                          </label>
                        </div>
                        <div className="student-submit-action-row">
                          <button
                            className="btn btn-primary"
                            onClick={() => handleSubmitSolution("editor")}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? "Đang gửi..." : selectedFlow.submitLabel}
                          </button>
                        </div>
                      </div>
                    )}

                    {submitMode === "file" && (
                      <div className="student-submit-method">
                        <div className="student-submit-method-header">
                          <span>Phương án 2</span>
                          <h3>Nộp file đính kèm</h3>
                        </div>
                        <div className="student-submit-method-body">
                          <div
                            className={`upload-zone student-submit-upload-zone ${dragActive ? "drag-active" : ""}`}
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <div className="upload-icon">FILE</div>
                            <div className="upload-text">
                              {isEncodingFiles
                                ? "Đang đọc file..."
                                : encodedSolutionFiles.length > 0
                                  ? `Đã sẵn sàng: ${encodedSolutionFiles.map(f => f.filename).join(', ')}`
                                  : selectedFlow.fileHint}
                            </div>
                            <div className="student-submit-upload-hint">
                              Có thể chọn nhiều file cùng lúc hoặc chọn từng file nhiều lần; hệ thống sẽ tự cộng dồn theo tên file.
                            </div>
                            <input
                              type="file"
                              multiple
                              accept={selectedAcceptedFiles}
                              ref={fileInputRef}
                              onChange={handleFileChange}
                              style={{ display: "none" }}
                            />
                          </div>
                        </div>

                        <div className="student-submit-action-row">
                          {(encodedSolutionFiles.length > 0 || solutionFiles.length > 0) && (
                            <button
                              className="btn btn-secondary"
                              onClick={clearSelectedFiles}
                              disabled={isSubmitting || isEncodingFiles}
                            >
                              Xóa file đã chọn
                            </button>
                          )}
                          <button
                            className="btn btn-primary"
                            onClick={() => handleSubmitSolution("file")}
                            disabled={isSubmitting || isEncodingFiles || encodedSolutionFiles.length === 0}
                          >
                            {isSubmitting ? "Đang gửi..." : isEncodingFiles ? "Đang đọc file..." : selectedFlow.submitLabel}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
              )}

              {submitSuccess && selectedQuestions.length === 0 && (
                <div className="student-submit-alert success">
                  Gửi bài nộp thành công! Kết quả chấm đang được hiển thị ở tab lịch sử.
                </div>
              )}

              {submitError && (
                <div className="student-submit-alert danger">
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
                            {isMounted ? formatDateTime(sub.created_at) : ""}
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
                          <p>{isMounted ? formatDateTime(selectedSubmission.created_at) : ""}</p>
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
