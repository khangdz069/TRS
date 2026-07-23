"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ChangeEvent, type FormEvent, type MouseEvent as ReactMouseEvent } from "react";
import { useRouter } from "next/navigation";
import mammoth from "mammoth";

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
  duration_minutes?: number;
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
type AssignmentWizardStep = "SETUP" | "CONTENT" | "TESTCASES" | "REVIEW";
type TestcaseVisibility = "SAMPLE" | "HIDDEN";
type TestcasePair = {
  input: string;
  expected: string;
  visibility: TestcaseVisibility;
};
type QuestionKind = "CODE" | "TEXT" | "SINGLE_CHOICE";
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

const ASSIGNMENT_WIZARD_STEPS: Array<{
  value: AssignmentWizardStep;
  title: string;
  helper: string;
}> = [
  { value: "SETUP", title: "Thiết lập", helper: "Thông tin bài" },
  { value: "CONTENT", title: "Nội dung", helper: "Câu hỏi và đề" },
  { value: "TESTCASES", title: "Testcase", helper: "Kiểm thử" },
  { value: "REVIEW", title: "Xem lại", helper: "Kiểm tra cuối" },
];

const SHOW_ASSIGNMENT_IMPORT_FIELD = true;

const DEFAULT_TESTCASE_PAIRS: TestcasePair[] = [
  { input: "1", expected: "NO", visibility: "SAMPLE" },
  { input: "2", expected: "YES", visibility: "SAMPLE" },
  { input: "9", expected: "NO", visibility: "HIDDEN" },
  { input: "17", expected: "YES", visibility: "HIDDEN" },
  { input: "100", expected: "NO", visibility: "HIDDEN" },
];

const TESTCASE_GROUPS: Array<{
  visibility: TestcaseVisibility;
  tone: "sample" | "hidden";
  title: string;
  description: string;
  addLabel: string;
  emptyLabel: string;
  moveLabel: string;
}> = [
  {
    visibility: "SAMPLE",
    tone: "sample",
    title: "Testcase hiển thị",
    description: "Sinh viên thấy để tự kiểm tra trước khi nộp.",
    addLabel: "Thêm",
    emptyLabel: "Chưa có testcase hiển thị.",
    moveLabel: "Ẩn testcase",
  },
  {
    visibility: "HIDDEN",
    tone: "hidden",
    title: "Testcase chấm ẩn",
    description: "Chỉ dùng khi chấm điểm, sinh viên không thấy dữ liệu này.",
    addLabel: "Thêm",
    emptyLabel: "Chưa có testcase chấm ẩn.",
    moveLabel: "Cho hiển thị",
  },
];

const createTestcasePair = (
  visibility: TestcaseVisibility = "SAMPLE",
  input = "",
  expected = "",
): TestcasePair => ({
  input,
  expected,
  visibility,
});

const normalizeTestcasePair = (
  item: Partial<TestcasePair> | undefined,
  fallbackVisibility: TestcaseVisibility = "SAMPLE",
): TestcasePair => {
  const visibility = item?.visibility === "HIDDEN" ? "HIDDEN" : fallbackVisibility;
  return {
    input: String(item?.input || ""),
    expected: String(item?.expected || ""),
    visibility,
  };
};

const isSampleTestcase = (pair: TestcasePair) => pair.visibility !== "HIDDEN";
const isTestcaseInGroup = (pair: TestcasePair, visibility: TestcaseVisibility) =>
  visibility === "SAMPLE" ? isSampleTestcase(pair) : !isSampleTestcase(pair);
const oppositeTestcaseVisibility = (visibility: TestcaseVisibility): TestcaseVisibility =>
  visibility === "SAMPLE" ? "HIDDEN" : "SAMPLE";

const padDatePart = (value: number) => String(value).padStart(2, "0");

const todayDateInputValue = () => {
  const today = new Date();
  return `${today.getFullYear()}-${padDatePart(today.getMonth() + 1)}-${padDatePart(today.getDate())}`;
};

const isValidDateParts = (day: number, month: number, year: number) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const formatDateOnly = (value?: string | null) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  const date = new Date(trimmed);
  if (!Number.isFinite(date.getTime())) return "";
  return `${padDatePart(date.getDate())}/${padDatePart(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const formatDateTime = (value?: string | null) => {
  const date = new Date(String(value || ""));
  if (!Number.isFinite(date.getTime())) return "";
  return `${padDatePart(date.getDate())}/${padDatePart(date.getMonth() + 1)}/${date.getFullYear()} ${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
};

const parseDisplayDate = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return isValidDateParts(day, month, year) ? `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}` : null;
  }

  const match = trimmed.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!isValidDateParts(day, month, year)) return null;
  return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
};

const createQuestion = (type: AssignmentType, index = 1): AssignmentQuestion => ({
  id: `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
  title: "",
  prompt: type === "QUIZ_CODE"
    ? "Chọn đáp án đúng nhất."
    : "",
  points: 1,
  kind: type === "QUIZ_CODE" ? "SINGLE_CHOICE" : "CODE",
  starterCode: "",
  referenceAnswer: "",
  options: ["", "", "", ""],
  correctOption: 0,
  testcases: type === "QUIZ_CODE" ? [] : [createTestcasePair("SAMPLE"), createTestcasePair("HIDDEN")],
});

const normalizeQuestion = (item: Partial<AssignmentQuestion>, index: number, type: AssignmentType): AssignmentQuestion => ({
  ...createQuestion(type, index + 1),
  ...item,
  id: String(item.id || `q-${index + 1}`),
  title: String(item.title || ""),
  prompt: String(item.prompt || ""),
  points: Number(item.points) || 1,
  kind: (item.kind === "TEXT" || item.kind === "SINGLE_CHOICE" || item.kind === "CODE")
    ? item.kind
    : (type === "QUIZ_CODE" ? "SINGLE_CHOICE" : "CODE"),
  options: Array.from({ length: 4 }, (_, optionIndex) => String(item.options?.[optionIndex] || "")),
  correctOption: Math.min(3, Math.max(0, Number(item.correctOption) || 0)),
  testcases: Array.isArray(item.testcases)
    ? item.testcases.map((pair) => normalizeTestcasePair(pair))
    : [],
});

const parseQuestionConfig = (value: string | undefined, type: AssignmentType): AssignmentQuestion[] => {
  if (!value || !value.trim()) return [createQuestion(type, 1)];
  try {
    const parsed = JSON.parse(value) as Partial<StructuredAssignmentConfig> | Partial<AssignmentQuestion>[];
    const questions = Array.isArray(parsed) ? parsed : parsed.questions;
    if (Array.isArray(questions) && questions.length > 0) {
      return questions.map((item, index) => normalizeQuestion(item, index, type));
    }
  } catch {
    // Older assignments stored a plain config string.
  }
  return [createQuestion(type, 1)];
};

const hasQuestionContent = (question: AssignmentQuestion) =>
  Boolean(
    question.title.trim() ||
    question.prompt.trim() ||
    question.starterCode.trim() ||
    question.referenceAnswer.trim() ||
    question.options.some((option) => option.trim()) ||
    question.testcases.some((pair) => pair.input.trim() || pair.expected.trim())
  );

const questionsForAssignmentEdit = (assignment: Assignment, type: AssignmentType): AssignmentQuestion[] => {
  const parsedQuestions = parseQuestionConfig(assignment.type_config, type);
  if (parsedQuestions.some(hasQuestionContent)) {
    return parsedQuestions;
  }

  if (type !== "STANDARD" && type !== "QUIZ_CODE") {
    return parsedQuestions;
  }

  const fallbackQuestion = createQuestion(type, 1);
  fallbackQuestion.title = assignment.name || "";
  fallbackQuestion.prompt = assignment.problem_statement || assignment.description || fallbackQuestion.prompt;

  if (type === "STANDARD") {
    const importedTestcases = parseTestcasePairs(assignment.testcase_samples);
    fallbackQuestion.starterCode = assignment.starter_code || "";
    fallbackQuestion.referenceAnswer = assignment.reference_solution || "";
    fallbackQuestion.testcases = importedTestcases.length ? importedTestcases : fallbackQuestion.testcases;
  }

  return [fallbackQuestion];
};

const stripMarker = (line: string, marker: string) =>
  line.replace(new RegExp(`^\\s*${marker}\\s*[:：-]?\\s*`, "i"), "").trim();

const parseOptionLine = (line: string) => {
  const match = line.match(/^\s*([A-D])[\).:：-]\s*(.+)$/i);
  return match ? { index: match[1].toUpperCase().charCodeAt(0) - 65, value: match[2].trim() } : null;
};

const splitQuestionDocument = (content: string, type: AssignmentType): AssignmentQuestion[] => {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [createQuestion(type, 1)];

  const chunks = normalized
    .split(/(?=^\s*(?:#{1,3}\s*)?(?:Câu|Cau|C\?u|Question)\s+\d+[\).:\-]?\s*)/gim)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const sourceChunks = chunks.length > 0 ? chunks : [normalized];

  return sourceChunks.map((chunk, index) => {
    const question = createQuestion(type, index + 1);
    const lines = chunk.split("\n").map((line) => line.trimEnd());
    const firstLine = lines[0] || `Câu ${index + 1}`;
    question.title = firstLine.replace(/^#{1,3}\s*/, "").replace(/^(Câu|Cau|C\?u|Question)\s+\d+[\).:\-]?\s*/i, "").trim();
    question.kind = type === "QUIZ_CODE" ? "SINGLE_CHOICE" : "CODE";
    question.options = ["", "", "", ""];
    question.testcases = [];

    const promptLines: string[] = [];
    let activeSection: "prompt" | "starter" | "answer" | "test" | "expected" = "prompt";
    let pendingTest = "";
    let pendingExpected = "";

    const flushTestcase = () => {
      if (pendingTest.trim() || pendingExpected.trim()) {
        question.testcases.push(createTestcasePair(question.testcases.length === 0 ? "SAMPLE" : "HIDDEN", pendingTest.trim(), pendingExpected.trim()));
      }
      pendingTest = "";
      pendingExpected = "";
    };

    for (const rawLine of lines.slice(1)) {
      const line = rawLine.trim();
      const option = parseOptionLine(rawLine);
      if (option) {
        question.kind = "SINGLE_CHOICE";
        question.options[option.index] = option.value;
        activeSection = "prompt";
        continue;
      }

      if (/^(Đáp án|Dap an|Answer)\s*[:：-]/i.test(line)) {
        const value = stripMarker(line, "(Đáp án|Dap an|Answer)");
        const optionAnswer = value.match(/^[A-D]$/i);
        if (optionAnswer) {
          question.correctOption = optionAnswer[0].toUpperCase().charCodeAt(0) - 65;
          question.kind = "SINGLE_CHOICE";
        } else {
          question.referenceAnswer = value;
          activeSection = "answer";
        }
        continue;
      }

      if (/^(Starter|Starter code|Khung code)\s*[:：-]/i.test(line)) {
        question.starterCode = stripMarker(line, "(Starter code|Starter|Khung code)");
        activeSection = "starter";
        continue;
      }

      if (/^(Test|Input)\s*[:：-]/i.test(line)) {
        flushTestcase();
        pendingTest = stripMarker(line, "(Test|Input)");
        activeSection = "test";
        continue;
      }

      if (/^(Expected|Output|Result)\s*[:：-]/i.test(line)) {
        pendingExpected = stripMarker(line, "(Expected|Output|Result)");
        activeSection = "expected";
        continue;
      }

      if (/^---+$/.test(line)) {
        flushTestcase();
        activeSection = "prompt";
        continue;
      }

      if (activeSection === "starter") {
        question.starterCode += `${question.starterCode ? "\n" : ""}${rawLine}`;
      } else if (activeSection === "answer") {
        question.referenceAnswer += `${question.referenceAnswer ? "\n" : ""}${rawLine}`;
      } else if (activeSection === "test") {
        pendingTest += `${pendingTest ? "\n" : ""}${rawLine}`;
      } else if (activeSection === "expected") {
        pendingExpected += `${pendingExpected ? "\n" : ""}${rawLine}`;
      } else if (line) {
        promptLines.push(rawLine);
      }
    }

    flushTestcase();
    question.prompt = promptLines.join("\n").trim() || question.prompt;
    if (question.kind === "SINGLE_CHOICE") {
      question.testcases = [];
    } else if (question.testcases.length === 0) {
      question.testcases = [createTestcasePair("SAMPLE"), createTestcasePair("HIDDEN")];
    }
    return question;
  });
};

const serializeQuestionConfig = (questions: AssignmentQuestion[]) =>
  JSON.stringify({
    version: 1,
    mode: "QUESTION_SET",
    questions,
  } satisfies StructuredAssignmentConfig);

const questionSetProblem = (questions: AssignmentQuestion[]) =>
  questions.map((question, index) => [
    `${index + 1}. ${question.title || `Câu ${index + 1}`}`,
    question.prompt,
    question.kind === "SINGLE_CHOICE"
      ? question.options.map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${option}`).join("\n")
      : "",
  ].filter(Boolean).join("\n")).join("\n\n");

const questionSetReference = (questions: AssignmentQuestion[]) =>
  questions.map((question, index) => {
    const answer = question.kind === "SINGLE_CHOICE"
      ? `${String.fromCharCode(65 + question.correctOption)}. ${question.options[question.correctOption] || ""}`
      : question.referenceAnswer;
    return `${index + 1}. ${question.title || `Câu ${index + 1}`}: ${answer || "Chưa nhập đáp án chuẩn"}`;
  }).join("\n");

const questionSetTestcases = (questions: AssignmentQuestion[]) =>
  questions.flatMap((question, questionIndex) =>
    question.testcases
      .filter((pair) => pair.input.trim() || pair.expected.trim())
      .map((pair, testcaseIndex) => ({
        input: pair.input,
        expected: pair.expected,
        question: questionIndex + 1,
        testcase: testcaseIndex + 1,
        visibility: pair.visibility,
      }))
  );

type TestcaseGroupEditorProps = {
  pairs: TestcasePair[];
  keyPrefix: string;
  inputLabel: string;
  expectedLabel: string;
  inputPlaceholder: string;
  expectedPlaceholder: string;
  canRemove: boolean;
  onAdd: (visibility: TestcaseVisibility) => void;
  onUpdate: <K extends keyof TestcasePair>(index: number, field: K, value: TestcasePair[K]) => void;
  onRemove: (index: number) => void;
};

function TestcaseGroupEditor({
  pairs,
  keyPrefix,
  inputLabel,
  expectedLabel,
  inputPlaceholder,
  expectedPlaceholder,
  canRemove,
  onAdd,
  onUpdate,
  onRemove,
}: TestcaseGroupEditorProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<TestcaseVisibility, boolean>>({
    SAMPLE: true,
    HIDDEN: false,
  });

  const toggleGroup = (visibility: TestcaseVisibility) => {
    setExpandedGroups((current) => ({
      ...current,
      [visibility]: !current[visibility],
    }));
  };

  const handleAdd = (visibility: TestcaseVisibility) => {
    setExpandedGroups((current) => ({
      ...current,
      [visibility]: true,
    }));
    onAdd(visibility);
  };

  return (
    <div className="testcase-group-list">
      {TESTCASE_GROUPS.map((group) => {
        const groupedTestcases = pairs
          .map((pair, index) => ({ pair, index }))
          .filter(({ pair }) => isTestcaseInGroup(pair, group.visibility));
        const isExpanded = expandedGroups[group.visibility];

        return (
          <section className={`testcase-group is-${group.tone} ${isExpanded ? "expanded" : "collapsed"}`} key={`${keyPrefix}-${group.visibility}`}>
            <div className="testcase-group-header">
              <div className="testcase-group-title">
                <span className="testcase-status-dot" aria-hidden="true" />
                <strong>{group.title}</strong>
              </div>
              <div className="testcase-group-actions">
                <span className="testcase-group-count">{groupedTestcases.length} case</span>
                {groupedTestcases.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-compact testcase-toggle-btn"
                    aria-expanded={isExpanded}
                    onClick={() => toggleGroup(group.visibility)}
                  >
                    {isExpanded ? "Thu gọn" : "Mở"}
                  </button>
                )}
                <button type="button" className="btn btn-secondary btn-compact testcase-add-btn" onClick={() => handleAdd(group.visibility)}>
                  {group.addLabel}
                </button>
              </div>
            </div>
            {isExpanded && groupedTestcases.length === 0 ? (
              <div className="testcase-group-empty">{group.emptyLabel}</div>
            ) : isExpanded ? (
              <div className="question-testcase-table">
                <div className="testcase-table-header">
                  <span>{inputLabel}</span>
                  <span>{expectedLabel}</span>
                  <span>Thao tác</span>
                </div>
                {groupedTestcases.map(({ pair, index }) => (
                  <div className="question-testcase-row" key={`${keyPrefix}-${group.visibility}-tc-${index}`}>
                    <label className="testcase-cell">
                      <span>{inputLabel}</span>
                      <textarea
                        className="form-control"
                        value={pair.input}
                        onChange={(e) => onUpdate(index, "input", e.target.value)}
                        rows={2}
                        placeholder={inputPlaceholder}
                      />
                    </label>
                    <label className="testcase-cell">
                      <span>{expectedLabel}</span>
                      <textarea
                        className="form-control"
                        value={pair.expected}
                        onChange={(e) => onUpdate(index, "expected", e.target.value)}
                        rows={2}
                        placeholder={expectedPlaceholder}
                      />
                    </label>
                    <div className="testcase-row-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-compact"
                        onClick={() => onUpdate(index, "visibility", oppositeTestcaseVisibility(group.visibility))}
                      >
                        {group.moveLabel}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-compact"
                        disabled={!canRemove}
                        onClick={() => onRemove(index)}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

const readAssignmentImportContent = async (file: File) => {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".zip")) {
    return `Imported starter archive: ${file.name}`;
  }
  if (lowerName.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value;
  }
  return file.text();
};

const ASSIGNMENT_TYPES: Array<{ value: AssignmentType; label: string; hint: string }> = [
  { value: "STANDARD", label: "Bài thường", hint: "Nộp mã nguồn và chấm bằng testcase." },
  { value: "FILL_BLANK", label: "Bài đục lỗ", hint: "Sinh viên hoàn thiện đoạn code còn thiếu." },
  { value: "DEBUGGING", label: "Bài sửa lỗi", hint: "Cho code lỗi và yêu cầu sửa đúng." },
  { value: "PROJECT", label: "Mini project", hint: "Nhiều file, nhiều tiêu chí đánh giá." },
  { value: "QUIZ_CODE", label: "Trắc nghiệm code", hint: "Câu hỏi ngắn có kiểm thử tự động." },
];

const VISIBLE_ASSIGNMENT_TYPES = ASSIGNMENT_TYPES.filter((type) => (
  type.value === "STANDARD" || type.value === "QUIZ_CODE"
));

const LANGUAGE_OPTIONS = [
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
  { value: "python", label: "Python" },
];

const GENERATION_STRATEGIES: Array<{ value: GenerationStrategy; label: string; hint: string }> = [
  { value: "MUTATION", label: "Biến đổi tham số", hint: "Tăng giảm số và giữ cấu trúc testcase gốc." },
  { value: "BOUNDARY", label: "Biên dữ liệu", hint: "Tạo min, max, rỗng, âm, trùng lặp." },
  { value: "RANDOMIZED", label: "Ngẫu nhiên kiểm soát", hint: "Sinh biến thể ổn định từ testcase mẫu." },
  { value: "PAIRWISE", label: "Tổ hợp cặp", hint: "Kết hợp từng cặp tham số quan trọng." },
];

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
    // Support old plain-text testcase samples.
  }

  return value.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s*(?:->|=>|\|)\s*/);
      return {
        input: (parts[0] || "").trim(),
        expected: (parts.slice(1).join(" ").trim()),
        visibility: "SAMPLE",
      };
    });
};

const serializeTestcasePairs = (pairs: TestcasePair[]) =>
  JSON.stringify(pairs.filter((pair) => pair.input.trim() || pair.expected.trim()));

const countSeedTestcases = (pairs: TestcasePair[]) =>
  pairs.filter((pair) => pair.input.trim() && pair.expected.trim()).length;

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

const generateTestcases = (samples: TestcasePair[], targetCount: number, strategy: GenerationStrategy) => {
  const seeds = samples.filter((pair) => pair.input.trim());
  if (seeds.length === 0 || targetCount <= 0) return [];
  return Array.from({ length: targetCount }, (_, index) => {
    const seed = seeds[index % seeds.length];
    const mutated = seed.input.replace(/-?\d+(\.\d+)?/g, (match) => mutateNumber(match, index, strategy));
    return {
      input: mutated === seed.input ? `${seed.input} # variant ${index + 1}` : mutated,
      expected: "Cần xác nhận",
    };
  });
};

const typeLabel = (value?: string) =>
  ASSIGNMENT_TYPES.find((item) => item.value === value)?.label || "Bài thường";

const strategyLabel = (value?: string) =>
  GENERATION_STRATEGIES.find((item) => item.value === value)?.label || "Biến đổi tham số";

const languageLabel = (values?: string[]) => {
  if (!values || values.length === 0) return "C";
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

const ASSIGNMENT_FLOW: Record<
  AssignmentType,
  {
    label: string;
    summary: string;
    importHint: string;
    problemLabel: string;
    problemPlaceholder: string;
    starterLabel?: string;
    starterPlaceholder?: string;
    solutionLabel: string;
    solutionPlaceholder: string;
    configLabel: string;
    configPlaceholder: string;
    testcaseTitle: string;
    testcaseHint: string;
    requireStarter: boolean;
    requireTestcases: boolean;
    requirements: string[];
  }
> = {
  STANDARD: {
    label: "Bài lập trình",
    summary: "Dùng khi sinh viên nộp source code và hệ thống chấm bằng testcase.",
    importHint: "Import .md/.txt để điền đề bài, hoặc file code để tham khảo khi viết đề.",
    problemLabel: "Đề bài cho sinh viên",
    problemPlaceholder: "Mô tả bài toán, input/output, ràng buộc, ví dụ và yêu cầu nộp.",
    solutionLabel: "Lời giải tham chiếu",
    solutionPlaceholder: "Dán lời giải chuẩn để đối chiếu và hỗ trợ sinh testcase.",
    configLabel: "Cấu hình chấm",
    configPlaceholder: "Ví dụ: time_limit=2s; memory=256MB; public_tests=10.",
    testcaseTitle: "Testcase chấm tự động",
    testcaseHint: "Mỗi dòng là một testcase mẫu. Có thể nhập file mẫu rồi để hệ thống tự tạo thêm biến thể.",
    requireStarter: false,
    requireTestcases: true,
    requirements: ["Đề bài", "Lời giải chuẩn", "Testcase mẫu"],
  },
  FILL_BLANK: {
    label: "Bài đục lỗ",
    summary: "Dùng khi giảng viên có code hoàn chỉnh/template và muốn sinh phần khuyết cho sinh viên điền.",
    importHint: "Import code hoàn chỉnh. Nếu có vùng muốn đục thủ công, đánh dấu /* HOLE:start */ ... /* HOLE:end */.",
    problemLabel: "Yêu cầu ngắn cho sinh viên",
    problemPlaceholder: "Nêu mục tiêu cần hoàn thiện, hàm/lớp không được đổi và định dạng nộp.",
    starterLabel: "Code hoàn chỉnh / template để đục lỗ",
    starterPlaceholder: "Dán code hoàn chỉnh hoặc template có marker HOLE. Hệ thống lưu phần này làm nguồn sinh starter.",
    solutionLabel: "Đáp án hoàn chỉnh",
    solutionPlaceholder: "Nếu khác template, dán bản chuẩn cuối cùng để chấm nội bộ.",
    configLabel: "Quy tắc đục lỗ",
    configPlaceholder: "Ví dụ: auto_holes=3; preserve_imports=true; required_regions=solve,compare.",
    testcaseTitle: "Testcase kiểm chứng lỗ trống",
    testcaseHint: "Testcase nên kiểm chứng đúng phần sinh viên phải điền, không cần quá nhiều cấu hình ngoài luồng.",
    requireStarter: true,
    requireTestcases: true,
    requirements: ["Template/code hoàn chỉnh", "Quy tắc đục lỗ", "Testcase kiểm chứng"],
  },
  DEBUGGING: {
    label: "Bài sửa lỗi",
    summary: "Dùng khi sinh viên nhận code lỗi và phải sửa để vượt testcase.",
    importHint: "Import file code lỗi. Lời giải đã sửa nhập ở vùng đáp án chuẩn.",
    problemLabel: "Hành vi đúng mong muốn",
    problemPlaceholder: "Mô tả output đúng, điều kiện biên và phần API sinh viên không được thay đổi.",
    starterLabel: "Code lỗi giao cho sinh viên",
    starterPlaceholder: "Dán code đang lỗi. Giữ nguyên public API nếu testcase phụ thuộc vào tên hàm/lớp.",
    solutionLabel: "Code đã sửa / lời giải chuẩn",
    solutionPlaceholder: "Dán bản đã sửa đúng để làm chuẩn đối chiếu.",
    configLabel: "Mô tả lỗi cần bắt",
    configPlaceholder: "Ví dụ: off-by-one ở biên phải; sai khi input rỗng; không xử lý số âm.",
    testcaseTitle: "Testcase bắt lỗi",
    testcaseHint: "Ưu tiên testcase lộ rõ bug, nhất là input biên và trường hợp từng làm code lỗi fail.",
    requireStarter: true,
    requireTestcases: true,
    requirements: ["Code lỗi", "Mô tả lỗi", "Code đã sửa", "Testcase bắt lỗi"],
  },
  PROJECT: {
    label: "Mini project",
    summary: "Dùng cho bài nhiều file, starter project, rubric và test tích hợp.",
    importHint: "Import .zip hoặc mô tả cây thư mục/starter files. Nếu browser không đọc được zip, tên file vẫn giúp ghi nhận nguồn import.",
    problemLabel: "Brief dự án",
    problemPlaceholder: "Mục tiêu dự án, tính năng bắt buộc, cách nộp, cấu trúc thư mục mong muốn.",
    starterLabel: "Starter project / cấu trúc thư mục",
    starterPlaceholder: "Dán cây thư mục, README starter, hoặc nội dung file chính.",
    solutionLabel: "Ghi chú nghiệm thu / lời giải mẫu",
    solutionPlaceholder: "Mô tả hành vi bản mẫu, checklist nghiệm thu hoặc link/nội dung solution nội bộ.",
    configLabel: "Rubric / tiêu chí chấm",
    configPlaceholder: "Ví dụ: 60% testcase, 20% kiến trúc, 20% báo cáo; bắt buộc có README và script chạy.",
    testcaseTitle: "Smoke / integration tests",
    testcaseHint: "Dán các input kiểm thử nhanh, script smoke test hoặc mô tả test tích hợp.",
    requireStarter: true,
    requireTestcases: false,
    requirements: ["Brief dự án", "Starter project", "Rubric", "Smoke tests"],
  },
  QUIZ_CODE: {
    label: "Quiz code",
    summary: "Dùng cho câu hỏi ngắn về đọc hiểu code, chọn đáp án hoặc điền kết quả.",
    importHint: "Import prompt hoặc snippet code để đưa vào câu hỏi.",
    problemLabel: "Câu hỏi / snippet code",
    problemPlaceholder: "Dán câu hỏi, đoạn code, các lựa chọn A/B/C/D nếu có.",
    solutionLabel: "Đáp án và giải thích",
    solutionPlaceholder: "Ghi đáp án đúng và giải thích ngắn để phản hồi cho sinh viên.",
    configLabel: "Cấu hình quiz",
    configPlaceholder: "Ví dụ: single-choice; shuffle=false; time_limit=10m; points=1.",
    testcaseTitle: "Kiểm chứng tùy chọn",
    testcaseHint: "Quiz thường không cần testcase. Chỉ dùng khi câu hỏi yêu cầu chạy code với input cụ thể.",
    requireStarter: false,
    requireTestcases: false,
    requirements: ["Câu hỏi", "Đáp án", "Cấu hình quiz"],
  },
};

const getAssignmentFlow = (type: AssignmentType) => ASSIGNMENT_FLOW[type] || ASSIGNMENT_FLOW.STANDARD;
const SIDEBAR_WIDTH_STORAGE_KEY = "trs.sidebarWidth";
const DEFAULT_SIDEBAR_WIDTH = 268;
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 460;

const clampSidebarWidth = (width: number) => Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));

export default function TeacherDashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const testcaseInputRef = useRef<HTMLInputElement>(null);
  const assignmentFileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TeacherTab>("assignments");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [assignmentWizardStep, setAssignmentWizardStep] = useState<AssignmentWizardStep>("SETUP");
  const [user, setUser] = useState<TeacherUser | null>(null);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [assignmentQuery, setAssignmentQuery] = useState("");
  const [assignmentTypeFilter, setAssignmentTypeFilter] = useState<"ALL" | AssignmentType>("ALL");
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");
  const [assignmentStatusNow, setAssignmentStatusNow] = useState<number | null>(null);
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
  const [newStartDisplay, setNewStartDisplay] = useState("");
  const [newEndDisplay, setNewEndDisplay] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [newDesc, setNewDesc] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [starterCode, setStarterCode] = useState("");
  const [referenceSolution, setReferenceSolution] = useState("");
  const [typeConfig, setTypeConfig] = useState("");
  const [questionItems, setQuestionItems] = useState<AssignmentQuestion[]>([createQuestion("STANDARD", 1)]);
  const questionListRef = useRef<HTMLDivElement | null>(null);
  const pendingQuestionFocusIdRef = useRef<string | null>(null);
  const [languages, setLanguages] = useState<string[]>(["c"]);
  const [generationStrategy, setGenerationStrategy] = useState<GenerationStrategy>("MUTATION");
  const [testcasePairs, setTestcasePairs] = useState<TestcasePair[]>(DEFAULT_TESTCASE_PAIRS);
  const [generatedCount, setGeneratedCount] = useState(20);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [studentForm, setStudentForm] = useState({ mssv: "", name: "", email: "" });
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [rosterSearch, setRosterSearch] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");

  const [isLoadingAsms, setIsLoadingAsms] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const selectedAssignment = assignments.find((assignment) => assignment.id === selectedAssignmentId) || null;
  const assignmentTypeOptions = Array.from(
    new Set(assignments.map((assignment) => assignment.assignment_type || "STANDARD"))
  ) as AssignmentType[];
  const getAssignmentStatus = (assignment: Assignment) => {
    if (!assignment.end_date) return "OPEN";
    if (assignmentStatusNow === null) return "OPEN";
    const endTime = new Date(assignment.end_date).getTime();
    return Number.isFinite(endTime) && endTime < assignmentStatusNow ? "CLOSED" : "OPEN";
  };
  const filteredAssignments = assignments.filter((assignment) => {
    const query = assignmentQuery.trim().toLowerCase();
    const searchable = [
      assignment.name,
      assignment.description,
      assignment.author_name,
      typeLabel(assignment.assignment_type),
      languageLabel(assignment.supported_languages),
      assignment.id,
    ].join(" ").toLowerCase();
    const matchesQuery = !query || searchable.includes(query);
    const matchesType = assignmentTypeFilter === "ALL" || (assignment.assignment_type || "STANDARD") === assignmentTypeFilter;
    const matchesStatus = assignmentStatusFilter === "ALL" || getAssignmentStatus(assignment) === assignmentStatusFilter;
    return matchesQuery && matchesType && matchesStatus;
  });
  const openAssignmentCount = assignments.filter((assignment) => getAssignmentStatus(assignment) === "OPEN").length;
  const closedAssignmentCount = assignments.length - openAssignmentCount;
  const assignmentTypeCount = new Set(assignments.map((asm) => asm.assignment_type || "STANDARD")).size;
  const languageCount = new Set(assignments.flatMap((asm) => asm.supported_languages || ["c"])).size;
  const getAssignmentDueInfo = (assignment: Assignment) => {
    if (!assignment.end_date) {
      return { dateLabel: "Không giới hạn", helper: "Mở" };
    }

    const endTime = new Date(assignment.end_date).getTime();
    if (!Number.isFinite(endTime) || assignmentStatusNow === null) {
      return { dateLabel: "Không giới hạn", helper: "Mở" };
    }

    const dateLabel = formatDateOnly(assignment.end_date);
    const diffMs = endTime - assignmentStatusNow;
    if (diffMs < 0) {
      return { dateLabel, helper: "Đóng" };
    }

    const diffDays = Math.ceil(diffMs / 86400000);
    return { dateLabel, helper: diffDays <= 1 ? "Hôm nay" : `${diffDays} ngày` };
  };
  const seedCount = countSeedTestcases(testcasePairs);
  const generatedPreview = generateTestcases(testcasePairs, Math.min(generatedCount, 8), generationStrategy);
  const assignmentFlow = getAssignmentFlow(newType);
  const isQuestionSetAssignment = newType === "STANDARD" || newType === "QUIZ_CODE";
  const activeQuestions = isQuestionSetAssignment ? questionItems : [];
  const questionTestcases = questionSetTestcases(activeQuestions);
  const questionSampleCount = activeQuestions.reduce(
    (sum, question) => sum + question.testcases.filter((pair) => isSampleTestcase(pair) && (pair.input.trim() || pair.expected.trim())).length,
    0,
  );
  const questionHiddenCount = activeQuestions.reduce(
    (sum, question) => sum + question.testcases.filter((pair) => !isSampleTestcase(pair) && (pair.input.trim() || pair.expected.trim())).length,
    0,
  );
  const assignmentWizardStepIndex = Math.max(0, ASSIGNMENT_WIZARD_STEPS.findIndex((step) => step.value === assignmentWizardStep));
  const isLastWizardStep = assignmentWizardStepIndex === ASSIGNMENT_WIZARD_STEPS.length - 1;

  const normalizeAssignmentDates = () => {
    const parsedStart = parseDisplayDate(newStart || newStartDisplay);
    const parsedEnd = parseDisplayDate(newEnd || newEndDisplay);
    if (!parsedStart || !parsedEnd) {
      alert("Vui lòng chọn ngày bắt đầu và hạn nộp.");
      return null;
    }

    setNewStart(parsedStart);
    setNewEnd(parsedEnd);
    setNewStartDisplay(formatDateOnly(parsedStart));
    setNewEndDisplay(formatDateOnly(parsedEnd));
    return { startDate: parsedStart, endDate: parsedEnd };
  };

  const validateWizardStep = (step: AssignmentWizardStep) => {
    if (step === "SETUP") {
      if (!newTitle.trim()) {
        alert("Vui lòng nhập tên bài tập.");
        return false;
      }
      return Boolean(normalizeAssignmentDates());
    }

    if (step === "CONTENT") {
      const flow = getAssignmentFlow(newType);
      if (isQuestionSetAssignment && !questionItems.some((question) => question.prompt.trim())) {
        alert("Vui lòng nhập ít nhất một câu hỏi.");
        return false;
      }
      if (newType === "QUIZ_CODE" && questionItems.some((question) => question.options.some((option) => !option.trim()))) {
        alert("Mỗi câu trắc nghiệm cần đủ 4 đáp án.");
        return false;
      }
      if (!isQuestionSetAssignment && !problemStatement.trim()) {
        alert(`Vui lòng nhập ${flow.problemLabel.toLowerCase()}.`);
        return false;
      }
      if (!isQuestionSetAssignment && flow.requireStarter && !starterCode.trim()) {
        alert(`Vui lòng nhập ${flow.starterLabel?.toLowerCase() || "starter/template"}.`);
        return false;
      }
      if (!isQuestionSetAssignment && !referenceSolution.trim()) {
        alert(`Vui lòng nhập ${flow.solutionLabel.toLowerCase()}.`);
        return false;
      }
      if (!isQuestionSetAssignment && !typeConfig.trim()) {
        alert(`Vui lòng nhập ${flow.configLabel.toLowerCase()}.`);
        return false;
      }
    }

    if (step === "TESTCASES" && !isQuestionSetAssignment && assignmentFlow.requireTestcases && seedCount === 0) {
      alert("Vui lòng nhập hoặc import ít nhất một testcase mẫu.");
      return false;
    }

    return true;
  };

  const goToNextWizardStep = () => {
    const nextStep = ASSIGNMENT_WIZARD_STEPS[assignmentWizardStepIndex + 1]?.value;
    if (nextStep) setAssignmentWizardStep(nextStep);
  };

  const goToPreviousWizardStep = () => {
    const previousStep = ASSIGNMENT_WIZARD_STEPS[assignmentWizardStepIndex - 1]?.value;
    if (previousStep) setAssignmentWizardStep(previousStep);
  };

  useEffect(() => {
    const focusId = pendingQuestionFocusIdRef.current;
    if (!focusId || !isQuestionSetAssignment) return;

    pendingQuestionFocusIdRef.current = null;
    window.requestAnimationFrame(() => {
      const cards = Array.from(questionListRef.current?.querySelectorAll<HTMLElement>("[data-question-id]") || []);
      const targetCard = cards.find((card) => card.dataset.questionId === focusId) || cards[cards.length - 1];
      targetCard?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => {
        targetCard?.querySelector<HTMLInputElement | HTMLTextAreaElement>(".form-control")?.focus();
      }, 180);
    });
  }, [questionItems.length, isQuestionSetAssignment]);

  useEffect(() => {
    setAssignmentStatusNow(Date.now());
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("trs_token");
    const storedUser = localStorage.getItem("trs_user");
    if (!token || !storedUser) {
      router.push("/login");
      return;
    }

    const parsedUser = JSON.parse(storedUser) as TeacherUser;
    if (parsedUser.role !== "TEACHER") {
      router.push("/login");
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
    const today = todayDateInputValue();
    setAssignmentWizardStep("SETUP");
    setNewTitle("");
    setNewType("STANDARD");
    setNewStart(today);
    setNewEnd(today);
    setNewStartDisplay(formatDateOnly(today));
    setNewEndDisplay(formatDateOnly(today));
    setDurationMinutes(0);
    setNewDesc("");
    setProblemStatement("");
    setStarterCode("");
    setReferenceSolution("");
    setTypeConfig("");
    setQuestionItems([createQuestion("STANDARD", 1)]);
    setLanguages(["c"]);
    setGenerationStrategy("MUTATION");
    setTestcasePairs(DEFAULT_TESTCASE_PAIRS);
    setGeneratedCount(20);
    setEditingAssignmentId(null);
    if (testcaseInputRef.current) testcaseInputRef.current.value = "";
  };

  const openCreateAssignment = () => {
    resetAssignmentForm();
    setIsModalOpen(true);
  };

  const openEditAssignment = (assignment: Assignment) => {
    setAssignmentWizardStep("SETUP");
    setEditingAssignmentId(assignment.id);
    setNewTitle(assignment.name || "");
    setNewType(assignment.assignment_type || "STANDARD");
    const startDate = (assignment.start_date || "").slice(0, 10);
    const endDate = (assignment.end_date || "").slice(0, 10);
    setNewStart(startDate);
    setNewEnd(endDate);
    setNewStartDisplay(formatDateOnly(startDate));
    setNewEndDisplay(formatDateOnly(endDate));
    setDurationMinutes(Math.max(0, Number(assignment.duration_minutes || 0)));
    setNewDesc(assignment.description || "");
    setProblemStatement(assignment.problem_statement || "");
    setStarterCode(assignment.starter_code || "");
    setReferenceSolution(assignment.reference_solution || "");
    setTypeConfig(assignment.type_config || "");
    setQuestionItems(questionsForAssignmentEdit(assignment, assignment.assignment_type || "STANDARD"));
    setLanguages(assignment.supported_languages?.length ? assignment.supported_languages : ["c"]);
    setGenerationStrategy(assignment.testcase_generation_strategy || "MUTATION");
    setTestcasePairs(parseTestcasePairs(assignment.testcase_samples));
    setGeneratedCount(assignment.generated_testcase_count || 0);
    setIsModalOpen(true);
  };

  const assignmentPayload = (startDate = newStart, endDate = newEnd) => ({
    name: newTitle,
    description: newDesc,
    assignment_type: newType,
    supported_languages: languages.join(","),
    testcase_samples: isQuestionSetAssignment ? JSON.stringify(questionTestcases) : serializeTestcasePairs(testcasePairs),
    testcase_generation_strategy: generationStrategy,
    testcase_seed_count: isQuestionSetAssignment ? questionTestcases.length : seedCount,
    generated_testcase_count: Math.max(0, generatedCount),
    duration_minutes: Math.max(0, durationMinutes),
    problem_statement: isQuestionSetAssignment ? questionSetProblem(activeQuestions) : problemStatement,
    starter_code: isQuestionSetAssignment ? activeQuestions.map((question) => question.starterCode).filter(Boolean).join("\n\n") : starterCode,
    reference_solution: isQuestionSetAssignment ? questionSetReference(activeQuestions) : referenceSolution,
    type_config: isQuestionSetAssignment ? serializeQuestionConfig(activeQuestions) : typeConfig,
    start_date: startDate,
    end_date: endDate,
  });

  const handleAssignmentFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (assignmentWizardStep !== "REVIEW") {
      goToNextWizardStep();
    }
  };

  const handleAddAssignment = async () => {
    if (assignmentWizardStep !== "REVIEW") return;
    const token = localStorage.getItem("trs_token");
    if (!token) return;

    if (!newTitle.trim()) {
      setAssignmentWizardStep("SETUP");
      alert("Vui lòng nhập tên bài tập.");
      return;
    }

    const normalizedDates = normalizeAssignmentDates();
    if (!normalizedDates) {
      setAssignmentWizardStep("SETUP");
      return;
    }
    if (!validateWizardStep("CONTENT")) {
      setAssignmentWizardStep("CONTENT");
      return;
    }
    if (!validateWizardStep("TESTCASES")) {
      setAssignmentWizardStep("TESTCASES");
      return;
    }

    try {
      const response = await fetch(editingAssignmentId ? `/api/assignments/${editingAssignmentId}` : "/api/assignments", {
        method: editingAssignmentId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(assignmentPayload(normalizedDates.startDate, normalizedDates.endDate)),
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
    setTestcasePairs(parseTestcasePairs(await file.text()));
  };

  const updateTestcasePair = <K extends keyof TestcasePair>(index: number, field: K, value: TestcasePair[K]) => {
    setTestcasePairs((current) => current.map((pair, pairIndex) =>
      pairIndex === index ? { ...pair, [field]: value } : pair
    ));
  };

  const addTestcasePair = (visibility: TestcaseVisibility = "HIDDEN") => {
    setTestcasePairs((current) => [...current, createTestcasePair(visibility)]);
  };

  const removeTestcasePair = (index: number) => {
    setTestcasePairs((current) => current.length <= 1 ? current : current.filter((_, pairIndex) => pairIndex !== index));
  };

  const addQuestionItem = () => {
    setQuestionItems((current) => {
      const nextQuestion = createQuestion(newType, current.length + 1);
      pendingQuestionFocusIdRef.current = nextQuestion.id;
      return [...current, nextQuestion];
    });
  };

  const removeQuestionItem = (index: number) => {
    setQuestionItems((current) => current.length <= 1 ? current : current.filter((_, questionIndex) => questionIndex !== index));
  };

  const updateQuestionItem = <K extends keyof AssignmentQuestion>(index: number, field: K, value: AssignmentQuestion[K]) => {
    setQuestionItems((current) => current.map((question, questionIndex) =>
      questionIndex === index ? { ...question, [field]: value } : question
    ));
  };

  const updateQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestionItems((current) => current.map((question, index) => {
      if (index !== questionIndex) return question;
      const options = [...question.options];
      options[optionIndex] = value;
      return { ...question, options };
    }));
  };

  const updateQuestionTestcase = <K extends keyof TestcasePair>(
    questionIndex: number,
    testcaseIndex: number,
    field: K,
    value: TestcasePair[K],
  ) => {
    setQuestionItems((current) => current.map((question, index) => {
      if (index !== questionIndex) return question;
      const testcases = question.testcases.map((pair, pairIndex) =>
        pairIndex === testcaseIndex ? { ...pair, [field]: value } : pair
      );
      return { ...question, testcases };
    }));
  };

  const addQuestionTestcase = (questionIndex: number, visibility: TestcaseVisibility = "HIDDEN") => {
    setQuestionItems((current) => current.map((question, index) =>
      index === questionIndex
        ? { ...question, testcases: [...question.testcases, createTestcasePair(visibility)] }
        : question
    ));
  };

  const removeQuestionTestcase = (questionIndex: number, testcaseIndex: number) => {
    setQuestionItems((current) => current.map((question, index) =>
      index === questionIndex
        ? { ...question, testcases: question.testcases.length <= 1 ? question.testcases : question.testcases.filter((_, pairIndex) => pairIndex !== testcaseIndex) }
        : question
    ));
  };

  const handleAssignmentFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await readAssignmentImportContent(file);
    if ((newType === "STANDARD" || newType === "QUIZ_CODE") && file.name.toLowerCase().endsWith(".json")) {
      const importedQuestions = parseQuestionConfig(content, newType);
      setQuestionItems(importedQuestions.length ? importedQuestions : [createQuestion(newType, 1)]);
      if (!newTitle.trim()) setNewTitle(file.name.replace(/\.[^.]+$/, ""));
      return;
    }
    if (newType === "STANDARD" || newType === "QUIZ_CODE") {
      const importedQuestions = splitQuestionDocument(content, newType);
      setQuestionItems(importedQuestions.length ? importedQuestions : [createQuestion(newType, 1)]);
      if (!newTitle.trim()) setNewTitle(file.name.replace(/\.[^.]+$/, ""));
      if (!newDesc.trim()) setNewDesc(`Import từ file ${file.name}`);
      return;
    }
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

  const handleAddStudent = async (e: FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("trs_token");
    if (!token || !selectedAssignmentId || isAddingStudent) return;

    const mssv = studentForm.mssv.trim();
    const email = studentForm.email.trim();
    const name = studentForm.name.trim();
    if (!mssv || !email) {
      setUploadMessage("");
      setUploadError("Vui lòng nhập MSSV và email sinh viên.");
      return;
    }

    setIsAddingStudent(true);
    setUploadMessage("");
    setUploadError("");

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignment_id: selectedAssignmentId,
          class_section: classSection.trim() || "Default",
          mssv,
          name,
          email,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setUploadMessage(`Đã thêm sinh viên ${email} vào lớp ${data.class_section || classSection || "Default"}.`);
        setStudentForm({ mssv: "", name: "", email: "" });
        fetchStudents(selectedAssignmentId);
      } else {
        setUploadError(data.error || "Không thể thêm sinh viên.");
      }
    } catch {
      setUploadError("Lỗi kết nối máy chủ khi thêm sinh viên.");
    } finally {
      setIsAddingStudent(false);
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

  const renderStudentRoster = () => {
    const selectedRoster =
      classRosters.find((roster) => roster.name === selectedClassName) ||
      classRosters[0] ||
      null;
    const rosterStudents = selectedRoster?.students || students;
    const rosterTitle = selectedRoster ? `Lớp ${selectedRoster.name}` : "Danh sách sinh viên";
    const rosterQuery = rosterSearch.trim().toLowerCase();
    const visibleStudents = rosterQuery
      ? rosterStudents.filter((student) => (
        [student.mssv, student.name, student.email]
          .join(" ")
          .toLowerCase()
          .includes(rosterQuery)
      ))
      : rosterStudents;
    const exportVisibleRoster = () => {
      const rows = [
        ["MSSV", "Ho ten", "Email"],
        ...visibleStudents.map((student) => [student.mssv || "", student.name || "", student.email || ""]),
      ];
      const csv = `\uFEFF${rows.map((row) => (
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )).join("\r\n")}`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedRoster?.name || "danh-sach-sinh-vien"}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="student-roster-card">
        <div className="student-roster-header">
          <div>
            <span className="student-roster-eyebrow">Danh sách sinh viên</span>
            <h4>{rosterTitle}</h4>
          </div>
          <span className="student-roster-count">{rosterStudents.length} sinh viên</span>
        </div>

        {classRosters.length > 1 && (
          <div className="class-roster-tabs" aria-label="Chọn lớp">
            {classRosters.map((roster) => (
              <button
                key={roster.name}
                type="button"
                className={selectedRoster?.name === roster.name ? "active" : ""}
                onClick={() => setSelectedClassName(roster.name)}
              >
                <span className="class-roster-name">{roster.name}</span>
                <span className="class-roster-count">{roster.student_count}</span>
              </button>
            ))}
          </div>
        )}

        <div className="student-roster-toolbar">
          <label className="student-roster-search">
            <span>Tìm kiếm</span>
            <input
              value={rosterSearch}
              onChange={(event) => setRosterSearch(event.target.value)}
              placeholder="Tìm MSSV, họ tên, email"
            />
          </label>
          <div className="student-roster-actions">
            <span>
              Hiển thị {visibleStudents.length}/{rosterStudents.length}
            </span>
            {rosterSearch && (
              <button type="button" onClick={() => setRosterSearch("")}>
                Xóa tìm
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (selectedAssignmentId) fetchStudents(selectedAssignmentId);
              }}
            >
              Làm mới
            </button>
            <button type="button" onClick={exportVisibleRoster} disabled={visibleStudents.length === 0}>
              Xuất CSV
            </button>
          </div>
        </div>

        {isLoadingStudents && <div className="student-roster-state">Đang tải danh sách sinh viên...</div>}
        {!isLoadingStudents && rosterStudents.length === 0 && (
          <div className="student-roster-state">Chưa có sinh viên trong bài tập này.</div>
        )}
        {!isLoadingStudents && rosterStudents.length > 0 && visibleStudents.length === 0 && (
          <div className="student-roster-state">Không tìm thấy sinh viên phù hợp.</div>
        )}
        {!isLoadingStudents && visibleStudents.length > 0 && (
          <div className="student-roster-table-wrap">
            <table className="student-roster-table">
              <thead>
                <tr>
                  <th>MSSV</th>
                  <th>Họ tên</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map((student) => (
                  <tr key={student.id || `${student.mssv}-${student.email}`}>
                    <td>{student.mssv || "-"}</td>
                    <td>{student.name || "Chưa có tên"}</td>
                    <td>{student.email || "-"}</td>
                  </tr>
                ))}
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
          <div className="teacher-header-actions">
            <span style={{ fontSize: "0.9rem", color: "hsl(var(--text-secondary))" }}>
              Chào giảng viên: <strong>{user?.name || "Teacher"}</strong>
            </span>
            <button onClick={logout} className="btn btn-danger">
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <div className="sidebar-layout">
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
            <div className="sidebar-title">Menu quản lý</div>
          </div>
          <nav className="sidebar-nav">
            <button className={`sidebar-link ${activeTab === "assignments" ? "active" : ""}`} onClick={() => setActiveTab("assignments")} title="Quản lý bài tập">
              <span className="sidebar-icon assignment" aria-hidden="true"></span>
              <span className="sidebar-label">Quản lý bài tập</span>
            </button>
            <button style={{ display: "none" }} className={`sidebar-link ${activeTab === "import" ? "active" : ""}`} onClick={() => setActiveTab("import")} title="Đăng ký sinh viên">
              <span className="sidebar-icon import" aria-hidden="true"></span>
              <span className="sidebar-label">Đăng ký sinh viên</span>
            </button>
            <button style={{ display: "none" }} className={`sidebar-link ${activeTab === "teachers" ? "active" : ""}`} onClick={() => setActiveTab("teachers")} title="Thêm giảng viên hợp tác">
              <span className="sidebar-icon teachers" aria-hidden="true"></span>
              <span className="sidebar-label">Thêm giảng viên hợp tác</span>
            </button>
            <button style={{ display: "none" }} className={`sidebar-link ${activeTab === "students" ? "active" : ""}`} onClick={() => setActiveTab("students")} title="Danh sách sinh viên">
              <span className="sidebar-icon students" aria-hidden="true"></span>
              <span className="sidebar-label">Danh sách sinh viên</span>
            </button>
            <button className={`sidebar-link ${activeTab === "analytics" ? "active" : ""}`} onClick={() => setActiveTab("analytics")} title="Thống kê survey">
              <span className="sidebar-icon analytics" aria-hidden="true"></span>
              <span className="sidebar-label">Thống kê survey</span>
            </button>
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

        <main className="content-area">
          {activeTab === "assignments" && (
            <div className="teacher-dashboard">
              <div className="teacher-page-toolbar teacher-assignment-toolbar">
                <div>
                  <h1>Quản lý bài tập</h1>
                </div>
                <button className="btn btn-primary" onClick={openCreateAssignment}>
                  Tạo bài tập
                </button>
              </div>

              <section className="teacher-assignment-stats" aria-label="Tổng quan bài tập lớn">
                <div>
                  <span>Tổng bài tập</span>
                  <strong>{assignments.length}</strong>
                  <small>Tất cả bài tập đang quản lý</small>
                </div>
                <div>
                  <span>Đang mở</span>
                  <strong>{openAssignmentCount}</strong>
                  <small>Sinh viên còn có thể nộp bài</small>
                </div>
                <div>
                  <span>Đã đóng</span>
                  <strong>{closedAssignmentCount}</strong>
                  <small>Đã hết hạn hoặc ngừng nhận bài</small>
                </div>
              </section>

              <section className="teacher-metrics-table-card" aria-label="Tổng quan bài tập lớn" style={{ display: "none" }}>
                <div className="teacher-metrics-header">
                  <div>
                    <h2>Tổng quan bài tập</h2>
                    <p>Các chỉ số chính của kho bài tập lớn.</p>
                  </div>
                </div>
                <div className="teacher-metrics-chunks">
                  <div className="teacher-metric-tile">
                    <span>Tổng bài</span>
                    <strong>{assignments.length}</strong>
                    <small>Bài tập lớn đã tạo</small>
                  </div>
                  <div className="teacher-metric-tile">
                    <span>Dạng bài</span>
                    <strong>{assignmentTypeCount}</strong>
                    <small>Loại bài đang dùng</small>
                  </div>
                  <div className="teacher-metric-tile">
                    <span>Ngôn ngữ</span>
                    <strong>{languageCount}</strong>
                    <small>Ngôn ngữ hỗ trợ</small>
                  </div>
                </div>
              </section>

              <div className="teacher-metrics teacher-metrics-grid-hidden">
                <Metric label="Tổng bài" value={assignments.length} />
                <Metric label="Dạng bài" value={assignmentTypeCount} />
                <Metric label="Ngôn ngữ" value={languageCount} />
              </div>

              <div className="assignment-workbench teacher-assignment-workspace">
                <section className="teacher-assignment-list-panel" aria-label="Danh sách bài tập lớn">
                  <div className="teacher-assignment-list-header">
                    <div>
                      <h2>Danh sách</h2>
                      <p>{filteredAssignments.length}/{assignments.length}</p>
                    </div>
                  </div>

                  <div className="teacher-assignment-list-tools">
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
                    <div className="teacher-assignment-filter-tabs" aria-label="Lọc bài tập theo trạng thái">
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

                  <div className="teacher-assignment-list-scroll">
                    {isLoadingAsms && (
                      <div className="assignment-list-state">Đang tải bài tập...</div>
                    )}
                    {!isLoadingAsms && filteredAssignments.length === 0 && (
                      <div className="assignment-list-state">
                        {assignments.length === 0 ? "Chưa có bài tập lớn nào." : "Không tìm thấy bài tập phù hợp."}
                      </div>
                    )}
                    {!isLoadingAsms && filteredAssignments.map((asm) => {
                      const isSelected = selectedAssignmentId === asm.id;
                      const status = getAssignmentStatus(asm);
                      const dueInfo = getAssignmentDueInfo(asm);
                      return (
                        <button
                          key={asm.id}
                          type="button"
                          className={`teacher-assignment-row ${isSelected ? "selected" : ""}`}
                          onClick={() => setSelectedAssignmentId(asm.id)}
                        >
                          <span className="teacher-assignment-row-main">
                            <strong>{asm.name}</strong>
                            <small>{typeLabel(asm.assignment_type)}</small>
                          </span>
                          <span className={`teacher-assignment-row-state ${status.toLowerCase()}`}>
                            {dueInfo.helper}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="assignment-detail-panel teacher-assignment-detail-panel" aria-label="Chi tiết bài tập lớn">
                  {selectedAssignment ? (
                    (() => {
                      const selectedStatus = getAssignmentStatus(selectedAssignment);
                      const selectedDueInfo = getAssignmentDueInfo(selectedAssignment);
                      return (
                    <>
                      <div className="teacher-assignment-detail-card">
                        <div className="teacher-assignment-detail-kicker">
                          <span>{typeLabel(selectedAssignment.assignment_type)}</span>
                        </div>

                        <div className="teacher-assignment-detail-header">
                          <div>
                            <h2>{selectedAssignment.name}</h2>
                            {selectedAssignment.description && <p>{selectedAssignment.description}</p>}
                          </div>
                        <div className="assignment-detail-actions">
                          <button className="btn btn-secondary" onClick={() => openEditAssignment(selectedAssignment)}>Sửa</button>
                          <button className="btn btn-danger" onClick={() => handleDeleteAssignment(selectedAssignment.id)}>Xóa</button>
                        </div>
                      </div>

                      <div className="teacher-assignment-meta-grid">
                        <div>
                          <span>Trạng thái</span>
                          <strong>{selectedStatus === "OPEN" ? "Đang mở" : "Đã đóng"}</strong>
                        </div>
                        <div>
                          <span>Ngôn ngữ</span>
                          <strong>{languageLabel(selectedAssignment.supported_languages)}</strong>
                        </div>
                        <div>
                          <span>Chiến lược</span>
                          <strong>{strategyLabel(selectedAssignment.testcase_generation_strategy)}</strong>
                        </div>
                        <div>
                          <span>Hạn nộp</span>
                          <strong>{selectedDueInfo.dateLabel}</strong>
                        </div>
                      </div>

                      <div className="teacher-assignment-testcases">
                        <div>
                          <span>Testcase mẫu</span>
                          <strong>{selectedAssignment.testcase_seed_count || 0} bộ</strong>
                        </div>
                      </div>
                      </div>

                      <div className="assignment-people-panel">
                        <div className="panel-title-row">
                          <div>
                            <h3>Quản lý lớp học</h3>
                          </div>
                          <span className="panel-count-pill">{students.length} sinh viên</span>
                        </div>
                        <div className="assignment-people-grid">
                          <div className="people-tool">
                            <div className="form-group">
                              <label className="form-label">Lớp</label>
                              <input
                                className="form-control"
                                value={classSection}
                                onChange={(e) => setClassSection(e.target.value)}
                                placeholder="IT3180-01"
                              />
                            </div>
                            <h4>Sinh viên</h4>
                            <form onSubmit={handleAddStudent} className="student-quick-form">
                              <div className="student-quick-grid">
                                <input
                                  className="form-control"
                                  placeholder="MSSV"
                                  value={studentForm.mssv}
                                  onChange={(e) => setStudentForm((current) => ({ ...current, mssv: e.target.value }))}
                                />
                                <input
                                  className="form-control"
                                  placeholder="Họ tên"
                                  value={studentForm.name}
                                  onChange={(e) => setStudentForm((current) => ({ ...current, name: e.target.value }))}
                                />
                                <input
                                  type="email"
                                  className="form-control"
                                  placeholder="email@sis.hust.edu.vn"
                                  value={studentForm.email}
                                  onChange={(e) => setStudentForm((current) => ({ ...current, email: e.target.value }))}
                                />
                              </div>
                              <button type="submit" className="btn btn-secondary" disabled={isAddingStudent || !selectedAssignmentId}>
                                {isAddingStudent ? "Đang thêm..." : "Thêm sinh viên"}
                              </button>
                            </form>
                            <div className="people-tool-divider"><span>hoặc nhập danh sách</span></div>
                            <input
                              type="file"
                              accept=".csv,.xlsx,.xls"
                              onChange={handleFileChange}
                              ref={fileInputRef}
                              id="assignment-roster-file-workbench"
                              style={{ display: "none" }}
                            />
                            <label htmlFor="assignment-roster-file-workbench" className="upload-strip">
                              <strong>{selectedFile?.name || "Chọn tệp CSV/XLSX"}</strong>
                              <span>MSSV, họ tên, email</span>
                            </label>
                            <button className="btn btn-primary" onClick={handleCSVUpload} disabled={!selectedFile || isUploading}>
                              {isUploading ? "Đang xử lý..." : "Nhập danh sách"}
                            </button>
                          </div>
                          <div className="people-tool">
                            <h4>Cộng tác</h4>
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
                              <span>{user?.email} - chủ sở hữu</span>
                              {coTeachers.map((email) => <span key={email}>{email}</span>)}
                            </div>
                          </div>
                        </div>
                        {uploadMessage && <div className="notice success">{uploadMessage}</div>}
                        {uploadError && <div className="notice danger">{uploadError}</div>}
                        {renderStudentRoster()}
                      </div>
                    </>
                      );
                    })()
                  ) : (
                    <div className="assignment-detail-empty">
                      <h2>Chọn một bài tập</h2>
                    </div>
                  )}
                </section>
              </div>

              <div className="assignment-command-panel" style={{ display: "none" }}>
                <div>
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

              {false && selectedAssignment && (
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
                        <strong>{selectedFile?.name || "Chọn tệp CSV/XLSX"}</strong>
                        <span>MSSV, Họ tên, Email</span>
                      </label>
                      <button className="btn btn-primary" onClick={handleCSVUpload} disabled={!selectedFile || isUploading}>
                        {isUploading ? "Đang xử lý..." : "Nhập danh sách"}
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
                  {renderStudentRoster()}
                </div>
              )}

              {false && isLoadingAsms && <p style={{ color: "hsl(var(--text-muted))" }}>Đang tải bài tập...</p>}
              {false && !isLoadingAsms && assignments.length === 0 && (
                <div className="tech-panel" style={{ textAlign: "center", padding: "3rem" }}>
                  <p style={{ color: "hsl(var(--text-muted))" }}>Chưa có bài tập lớn nào được tạo.</p>
                </div>
              )}

              {false && (
              <div style={{ display: "none" }}>
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
                    Hạn nộp: {asm.end_date ? formatDateOnly(asm.end_date) : "Không giới hạn"}
                      </span>
                    </div>
                    <p style={{ color: "hsl(var(--text-secondary))", fontSize: "0.95rem", marginBottom: "1rem" }}>{asm.description}</p>
                    <div className="assignment-meta-grid">
                      <Info label="Ngôn ngữ" value={languageLabel(asm.supported_languages)} />
                      <Info label="Testcase mẫu" value={`${asm.testcase_seed_count || 0} bộ`} />
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
              )}
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
                    style={{ background: "white" }}
                  >
                    {assignments.map((asm) => (
                      <option key={asm.id} value={asm.id}>{asm.name}</option>
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
                  background: "hsl(var(--bg-card))",
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
                <div className="notice success">
                  {uploadMessage}
                </div>
              )}

              {uploadError && (
                <div className="notice danger">
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
                  <div className="two-column-grid">
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
                              <div style={{ flex: 1, background: "hsl(var(--bg-card))", height: "12px", borderRadius: "6px", overflow: "hidden" }}>
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
                          <div key={`${feedback.created_at || idx}`} style={{ padding: "1rem", background: "hsl(var(--bg-card))", borderRadius: "var(--radius-sm)", borderLeft: "3px solid hsl(var(--color-primary))" }}>
                            <div style={{ marginBottom: "0.5rem" }}>
                              <span>{feedback.rating}/5 sao</span>
                              <span style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))", marginLeft: "1rem" }}>
                          {feedback.created_at ? formatDateTime(feedback.created_at) : ""}
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
          <div className="modal-container assignment-builder-container">
            <div className="modal-header">
              <h3 className="modal-title">{editingAssignmentId ? "Sửa bài tập" : "Tạo bài tập lớn mới"}</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAssignmentFormSubmit}>
              <div className="modal-body">
                <div className="assignment-wizard-stepper" aria-label="Tiến trình tạo bài tập">
                  {ASSIGNMENT_WIZARD_STEPS.map((step, index) => {
                    const isActive = index === assignmentWizardStepIndex;
                    const isComplete = index < assignmentWizardStepIndex;
                    const isReachable = index <= assignmentWizardStepIndex;
                    return (
                      <button
                        type="button"
                        key={step.value}
                        className={`assignment-wizard-step ${isActive ? "active" : ""} ${isComplete ? "complete" : ""}`}
                        disabled={!isReachable}
                        onClick={() => setAssignmentWizardStep(step.value)}
                      >
                        <span>{isComplete ? "✓" : index + 1}</span>
                        <div>
                          <strong>{step.title}</strong>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {assignmentWizardStep === "SETUP" && (
                <>
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
                  <label className="form-label">Mô tả bài tập</label>
                  <textarea
                    className="form-control"
                    placeholder="Mô tả các yêu cầu và đầu ra cần có..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày bắt đầu</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newStart}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewStart(value);
                      setNewStartDisplay(formatDateOnly(value));
                    }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hạn nộp bài</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newEnd}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewEnd(value);
                      setNewEndDisplay(formatDateOnly(value));
                    }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Thời gian làm bài</label>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    step={1}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="Ví dụ: 60"
                  />
                  <p className="field-hint">Nhập số phút sinh viên được làm bài. Để 0 nếu không giới hạn thời gian.</p>
                </div>
                </>
                )}
                {assignmentWizardStep === "CONTENT" && (
                <>
                <div className="form-group assignment-type-section">
                  <label className="form-label">Dạng bài</label>
                  <div className="assignment-type-grid">
                    {VISIBLE_ASSIGNMENT_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        className={`assignment-type-option ${newType === type.value ? "selected" : ""}`}
                        onClick={() => {
                          setNewType(type.value);
                          if (type.value === "STANDARD" || type.value === "QUIZ_CODE") {
                            setQuestionItems((current) => current.map((question) => ({
                              ...question,
                              kind: type.value === "QUIZ_CODE" ? "SINGLE_CHOICE" : "CODE",
                              title: question.title,
                              options: type.value === "QUIZ_CODE" ? question.options : ["", "", "", ""],
                              testcases: type.value === "QUIZ_CODE" ? [] : (question.testcases.length ? question.testcases : [createTestcasePair("SAMPLE"), createTestcasePair("HIDDEN")]),
                            })));
                          }
                        }}
                      >
                        <strong>{getAssignmentFlow(type.value).label}</strong>
                        <span>{getAssignmentFlow(type.value).summary}</span>
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
                {SHOW_ASSIGNMENT_IMPORT_FIELD && (
                  <div className="form-group import-field">
                    <label className="form-label">Import file bài tập</label>
                    <input
                      type="file"
                      ref={assignmentFileInputRef}
                      accept=".txt,.md,.docx,.cpp,.c,.h,.hpp,.java,.py,.js,.ts,.json,.zip"
                      onChange={handleAssignmentFileChange}
                    />
                    <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.85rem" }}>
                      Bài thường/quiz: file vào đề bài. Đục lỗ/sửa lỗi/project: file vào template hoặc starter code.
                    </p>
                  </div>
                )}
                </>
                )}
                {isQuestionSetAssignment && (assignmentWizardStep === "CONTENT" || assignmentWizardStep === "TESTCASES") && (
                  <div className={`question-builder-panel ${assignmentWizardStep === "TESTCASES" ? "question-testcase-detail-panel" : ""}`}>
                    {assignmentWizardStep === "CONTENT" ? (
                      <div className="question-list-heading-row">
                        <div>
                          <label className="form-label">{newType === "QUIZ_CODE" ? "Danh sách câu trắc nghiệm" : "Danh sách câu hỏi lập trình"}</label>
                          {newType === "QUIZ_CODE" && (
                            <p className="field-hint">Mỗi câu có 4 đáp án, chọn một đáp án đúng.</p>
                          )}
                        </div>
                        <button type="button" className="btn btn-secondary" onClick={addQuestionItem}>
                          Thêm câu hỏi
                        </button>
                      </div>
                    ) : (
                      <div className="panel-title-row">
                        <div>
                          <h4>Testcase theo từng câu</h4>
                          <p>Mỗi câu giữ testcase hiển thị và testcase chấm ẩn trong một vùng riêng.</p>
                        </div>
                      </div>
                    )}
                    <div className="question-builder-list" ref={questionListRef}>
                      {questionItems.map((question, questionIndex) => (
                        <div className="question-builder-card" key={question.id} data-question-id={question.id}>
                          <div className="question-builder-card-header">
                            <div className="question-builder-card-title">
                              <span className="question-number-badge">{questionIndex + 1}</span>
                              <div>
                                <span className="question-builder-card-kicker">Câu hỏi</span>
                                <strong>{question.title.trim() || "Chưa đặt tiêu đề"}</strong>
                              </div>
                            </div>
                            <button type="button" className="btn btn-secondary" onClick={() => removeQuestionItem(questionIndex)}>
                              Xóa câu
                            </button>
                          </div>
                          {assignmentWizardStep === "CONTENT" && (
                          <>
                            <div className="question-builder-meta">
                              <label>
                                <span>Tiêu đề ngắn</span>
                                <input
                                  className="form-control"
                                  value={question.title}
                                  onChange={(e) => updateQuestionItem(questionIndex, "title", e.target.value)}
                                  placeholder="Nhập tiêu đề ngắn"
                                />
                              </label>
                              <label>
                                <span>Điểm</span>
                                <input
                                  className="form-control"
                                  type="number"
                                  min={0}
                                  step={0.25}
                                  value={question.points}
                                  onChange={(e) => updateQuestionItem(questionIndex, "points", Number(e.target.value))}
                                />
                              </label>
                            </div>
                            <label className="question-builder-field">
                              <span>Nội dung câu hỏi</span>
                              <textarea
                                className="form-control"
                                value={question.prompt}
                                onChange={(e) => updateQuestionItem(questionIndex, "prompt", e.target.value)}
                                rows={4}
                                placeholder={newType === "QUIZ_CODE" ? "Ví dụ: Độ phức tạp của thuật toán binary search là gì?" : "Ví dụ: Viết chương trình đọc n và in các số từ 1 đến n."}
                              />
                            </label>
                            {newType === "QUIZ_CODE" ? (
                              <div className="question-options-grid">
                                {question.options.map((option, optionIndex) => (
                                  <label key={`option-${question.id}-${optionIndex}`} className={question.correctOption === optionIndex ? "selected" : ""}>
                                    <input
                                      type="radio"
                                      name={`correct-${question.id}`}
                                      checked={question.correctOption === optionIndex}
                                      onChange={() => updateQuestionItem(questionIndex, "correctOption", optionIndex)}
                                    />
                                    <span>{String.fromCharCode(65 + optionIndex)}</span>
                                    <input
                                      className="form-control"
                                      value={option}
                                      onChange={(e) => updateQuestionOption(questionIndex, optionIndex, e.target.value)}
                                      placeholder={`Đáp án ${String.fromCharCode(65 + optionIndex)}`}
                                    />
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <>
                                <label className="question-builder-field">
                                  <span>Starter code / khung trả lời</span>
                                  <textarea
                                    className="form-control testcase-textarea"
                                    value={question.starterCode}
                                    onChange={(e) => updateQuestionItem(questionIndex, "starterCode", e.target.value)}
                                    rows={4}
                                    placeholder={"Ví dụ:\n#include <stdio.h>\n\nint main(void) {\n  int n;\n  scanf(\"%d\", &n);\n  // viết lời giải tại đây\n  return 0;\n}"}
                                  />
                                </label>
                                <label className="question-builder-field">
                                  <span>Đáp án chuẩn</span>
                                  <textarea
                                    className="form-control testcase-textarea"
                                    value={question.referenceAnswer}
                                    onChange={(e) => updateQuestionItem(questionIndex, "referenceAnswer", e.target.value)}
                                    rows={4}
                                    placeholder="Output đúng"
                                  />
                                </label>
                              </>
                            )}
                          </>
                          )}
                          {assignmentWizardStep === "TESTCASES" && (
                            newType === "QUIZ_CODE" ? (
                              <div className="question-testcase-panel">
                                <p className="field-hint">Câu trắc nghiệm được chấm theo đáp án đúng đã chọn ở bước nội dung.</p>
                              </div>
                            ) : (
                              <div className="question-testcase-panel">
                                <TestcaseGroupEditor
                                  pairs={question.testcases}
                                  keyPrefix={question.id}
                                  inputLabel="Input"
                                  expectedLabel="Expected"
                                  inputPlaceholder="5"
                                  expectedPlaceholder="1 2 3 4 5"
                                  canRemove={question.testcases.length > 1}
                                  onAdd={(visibility) => addQuestionTestcase(questionIndex, visibility)}
                                  onUpdate={(testcaseIndex, field, value) => updateQuestionTestcase(questionIndex, testcaseIndex, field, value)}
                                  onRemove={(testcaseIndex) => removeQuestionTestcase(questionIndex, testcaseIndex)}
                                />
                              </div>
                            )
                          )}
                        </div>
                      ))}
                      {assignmentWizardStep === "CONTENT" && (
                      <div className="question-builder-add-row">
                        <div>
                          <strong>Thêm câu hỏi tiếp theo</strong>
                          <span>Câu mới sẽ nằm ngay dưới cùng và tự đưa con trỏ tới ô nhập đầu tiên.</span>
                        </div>
                        <button type="button" className="btn btn-secondary" onClick={addQuestionItem}>
                          Thêm câu hỏi
                        </button>
                      </div>
                      )}
                    </div>
                  </div>
                )}
                {isQuestionSetAssignment && assignmentWizardStep === "TESTCASES" && (
                  <div className="assignment-testcase-builder question-testcase-summary-panel">
                    <div className="panel-title-row">
                      <div>
                        <h4>{newType === "QUIZ_CODE" ? "Chấm trắc nghiệm" : "Tổng testcase"}</h4>
                        {newType === "QUIZ_CODE" && (
                          <p>Trắc nghiệm được chấm theo đáp án đúng A/B/C/D đã chọn ở từng câu.</p>
                        )}
                      </div>
                      <span>
                        {newType === "QUIZ_CODE"
                          ? `${questionItems.length} câu`
                          : `${questionTestcases.length} testcase`}
                      </span>
                    </div>

                    {newType !== "QUIZ_CODE" && (
                      <div className="question-testcase-summary-strip">
                        <span><strong>{questionSampleCount}</strong> hiển thị</span>
                        <span><strong>{questionHiddenCount}</strong> chấm ẩn</span>
                      </div>
                    )}

                  </div>
                )}
                {!isQuestionSetAssignment && assignmentWizardStep === "CONTENT" && (
                <>
                <div className="assignment-logic-panel">
                  <div className="panel-title-row">
                    <div>
                      <h4>{assignmentFlow.label}</h4>
                      <p>{assignmentFlow.importHint}</p>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{assignmentFlow.problemLabel}</label>
                    <textarea
                      className="form-control"
                      value={problemStatement}
                      onChange={(e) => setProblemStatement(e.target.value)}
                      rows={4}
                      placeholder={assignmentFlow.problemPlaceholder}
                    />
                  </div>
                  {assignmentFlow.starterLabel && (
                    <div className="form-group">
                      <label className="form-label">{assignmentFlow.starterLabel}</label>
                      <textarea
                        className="form-control testcase-textarea"
                        value={starterCode}
                        onChange={(e) => setStarterCode(e.target.value)}
                        rows={7}
                        placeholder={assignmentFlow.starterPlaceholder}
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">{assignmentFlow.solutionLabel}</label>
                    <textarea
                      className="form-control testcase-textarea"
                      value={referenceSolution}
                      onChange={(e) => setReferenceSolution(e.target.value)}
                      rows={6}
                      placeholder={assignmentFlow.solutionPlaceholder}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{assignmentFlow.configLabel}</label>
                    <textarea
                      className="form-control"
                      value={typeConfig}
                      onChange={(e) => setTypeConfig(e.target.value)}
                      rows={3}
                      placeholder={assignmentFlow.configPlaceholder}
                    />
                  </div>
                </div>
                </>
                )}
                {!isQuestionSetAssignment && assignmentWizardStep === "TESTCASES" && (
                <>
                <div className="builder-step-heading">
                  <div>
                    <strong>Testcase và chấm điểm</strong>
                    <p>{assignmentFlow.requireTestcases ? "Dạng bài này cần testcase mẫu để chấm tự động. Hệ thống có thể tự tạo thêm biến thể từ các testcase đó." : "Dạng bài này không bắt buộc testcase; chỉ nhập khi cần kiểm chứng tự động."}</p>
                  </div>
                </div>
                <div className="assignment-testcase-builder">
                  <div className="panel-title-row">
                    <div>
                      <h4>{assignmentFlow.testcaseTitle}</h4>
                      <p>{assignmentFlow.testcaseHint}</p>
                    </div>
                    <span>{assignmentFlow.requireTestcases ? `${seedCount} testcase mẫu + ${generatedCount} tự tạo` : "Tùy chọn"}</span>
                  </div>
                  <div className="testcase-builder-grid">
                    <div>
                      {assignmentFlow.requireTestcases && (
                      <>
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
                        <label className="form-label">Số testcase tự tạo thêm</label>
                        <input
                          className="form-control"
                          type="number"
                          min={0}
                          max={500}
                          value={generatedCount}
                          onChange={(e) => setGeneratedCount(Number(e.target.value))}
                        />
                      </div>
                      </>
                      )}
                      <div className="form-group">
                        <label className="form-label">Import testcase mẫu</label>
                        <input type="file" accept=".txt,.csv,.json" ref={testcaseInputRef} onChange={handleTestcaseFileChange} />
                      </div>
                    </div>
                    <div className="form-group">
                      <div className="testcase-pair-header">
                        <div>
                          <label className="form-label">Bảng testcase</label>
                          <span className="testcase-count-line">
                            {testcasePairs.filter(isSampleTestcase).length} hiển thị · {testcasePairs.filter((pair) => !isSampleTestcase(pair)).length} chấm ẩn
                          </span>
                        </div>
                      </div>
                      <TestcaseGroupEditor
                        pairs={testcasePairs}
                        keyPrefix="assignment"
                        inputLabel="Input"
                        expectedLabel="Expected output"
                        inputPlaceholder="Ví dụ: 17"
                        expectedPlaceholder="Ví dụ: YES"
                        canRemove={testcasePairs.length > 1}
                        onAdd={addTestcasePair}
                        onUpdate={updateTestcasePair}
                        onRemove={removeTestcasePair}
                      />
                      <p className="field-hint">Mỗi dòng là một testcase hoàn chỉnh. Input và expected output được tách riêng để tránh nhập nhầm.</p>
                    </div>
                  </div>
                  {assignmentFlow.requireTestcases && (
                  <div className="generated-preview">
                    <div className="panel-title-row">
                      <strong>Xem trước testcase tự tạo</strong>
                      <span>{strategyLabel(generationStrategy)}</span>
                    </div>
                    <pre>{generatedPreview.map((pair) => `${pair.input} -> ${pair.expected}`).join("\n") || "Thêm testcase mẫu để xem preview."}</pre>
                  </div>
                  )}
                </div>
                </>
                )}
                {assignmentWizardStep === "REVIEW" && (
                  <div className="assignment-review-panel">
                    <div className="panel-title-row">
                      <div>
                        <h4>Xem lại trước khi {editingAssignmentId ? "lưu" : "tạo"}</h4>
                        <p>Kiểm tra nhanh thông tin, nội dung và cấu hình chấm trước khi gửi lên hệ thống.</p>
                      </div>
                    </div>
                    <div className="assignment-review-grid">
                      <section>
                        <span>Tên bài</span>
                        <strong>{newTitle || "Chưa nhập tên bài"}</strong>
                        <p>{assignmentFlow.label} · {languageLabel(languages)}</p>
                      </section>
                      <section>
                        <span>Thời gian</span>
                        <strong>{newStart ? formatDateOnly(newStart) : "Chưa có ngày"} → {newEnd ? formatDateOnly(newEnd) : "Chưa có hạn"}</strong>
                        <p>{durationMinutes > 0 ? `${durationMinutes} phút làm bài` : "Không giới hạn thời gian làm bài"}</p>
                      </section>
                      <section>
                        <span>Nội dung</span>
                        <strong>{isQuestionSetAssignment ? `${questionItems.length} câu` : assignmentFlow.problemLabel}</strong>
                        <p>
                          {isQuestionSetAssignment
                            ? `${questionItems.reduce((sum, question) => sum + Number(question.points || 0), 0)} điểm`
                            : (problemStatement || "Chưa nhập nội dung chính.")}
                        </p>
                      </section>
                      <section>
                        <span>Chấm điểm</span>
                        <strong>
                          {isQuestionSetAssignment
                            ? `${questionSampleCount} hiển thị · ${questionHiddenCount} chấm ẩn`
                            : `${testcasePairs.filter(isSampleTestcase).length} hiển thị · ${testcasePairs.filter((pair) => !isSampleTestcase(pair)).length} chấm ẩn`}
                        </strong>
                        <p>{isQuestionSetAssignment ? `${questionTestcases.length} testcase đã nhập từ các câu hỏi` : `${generatedCount} testcase tự tạo thêm`}</p>
                      </section>
                    </div>
                  </div>
                )}
                {isQuestionSetAssignment && assignmentWizardStep === "REVIEW" && (
                  <div className="student-preview-panel review-student-preview-panel">
                    <div className="compact-section-heading">
                      <h4>Preview phía sinh viên</h4>
                      <span>{newType === "QUIZ_CODE" ? `${questionItems.length} câu` : `${questionSampleCount} testcase hiển thị`}</span>
                    </div>
                    <div className="student-preview-list">
                      {activeQuestions.map((question, index) => {
                        const samplePairs = question.testcases.filter(isSampleTestcase).filter((pair) => pair.input.trim() || pair.expected.trim());
                        return (
                          <div className="student-preview-question" key={`preview-${question.id}`}>
                            <div>
                              <span>Câu {index + 1}</span>
                              <strong>{question.title || `Câu ${index + 1}`}</strong>
                            </div>
                            <p>{question.prompt || "Chưa nhập nội dung câu hỏi."}</p>
                            {question.kind === "SINGLE_CHOICE" ? (
                              <ul>
                                {question.options.map((option, optionIndex) => (
                                  <li key={`preview-option-${question.id}-${optionIndex}`}>
                                    {String.fromCharCode(65 + optionIndex)}. {option || `Đáp án ${String.fromCharCode(65 + optionIndex)}`}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="student-preview-testcases">
                                {samplePairs.length > 0
                                  ? samplePairs.map((pair, pairIndex) => (
                                      <code key={`preview-sample-${question.id}-${pairIndex}`}>{pair.input || "Không có input"} → {pair.expected || "Chưa có expected"}</code>
                                    ))
                                  : <em>Chưa có testcase hiển thị cho sinh viên.</em>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Hủy
                </button>
                <div className="assignment-wizard-footer-actions">
                  {assignmentWizardStepIndex > 0 && (
                    <button type="button" className="btn btn-secondary" onClick={goToPreviousWizardStep}>
                      Quay lại
                    </button>
                  )}
                  {!isLastWizardStep ? (
                    <button type="button" className="btn btn-primary" onClick={goToNextWizardStep}>
                      Tiếp theo
                    </button>
                  ) : (
                    <button type="button" className="btn btn-primary" onClick={handleAddAssignment}>
                      {editingAssignmentId ? "Lưu thay đổi" : "Tạo mới"}
                    </button>
                  )}
                </div>
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
          style={{ background: "white" }}
        >
          <option value="" disabled>-- Chọn bài tập lớn --</option>
          {assignments.map((assignment) => (
            <option key={assignment.id} value={assignment.id}>
              {assignment.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
