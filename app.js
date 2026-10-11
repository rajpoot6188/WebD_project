/**
 * Online Quiz Management System - Frontend Application Logic
 *
 * Implements:
 * 1. Administrator question CRUD operations (Add, Update, Delete, View).
 * 2. Student quiz runner using Queue (FIFO delivery) and Stack (LIFO review/backtracking).
 * 3. PriorityQueue / Max-Heap logic for dynamic Leaderboard rankings.
 * 4. Dual-mode execution:
 *    - Connects to Java backend REST API if available (at /api/*)
 *    - Falls back gracefully to local in-memory/localStorage engine when loaded via file://
 */

// Initial Seed Data (mirrors QuizManager.java)
const INITIAL_QUIZZES = [
  {
    quizId: "JAVA101",
    title: "Core Java Programming",
    description: "Basics of Java, OOP, Memory & Control Flow",
    questions: [
      {
        id: 1,
        questionText: "Which of the following is not a primitive data type in Java?",
        options: ["int", "float", "String", "boolean"],
        correctOption: 3,
        marks: 10
      },
      {
        id: 2,
        questionText: "What is the default value of an uninitialized boolean instance variable in Java?",
        options: ["true", "false", "0", "null"],
        correctOption: 2,
        marks: 10
      },
      {
        id: 3,
        questionText: "Which mechanism allows a subclass to provide a specific implementation of a parent class method?",
        options: ["Method Overloading", "Method Overriding", "Data Abstraction", "Encapsulation"],
        correctOption: 2,
        marks: 10
      },
      {
        id: 4,
        questionText: "Which interface is the root of the Java Collections Framework (excluding Map)?",
        options: ["List", "Collection", "Iterable", "Queue"],
        correctOption: 2,
        marks: 10
      },
      {
        id: 5,
        questionText: "What happens when you try to insert a duplicate element into a HashSet?",
        options: [
          "Throws DuplicateElementException",
          "Overwrites the existing element",
          "The add() method returns false and nothing is inserted",
          "Causes a compile-time error"
        ],
        correctOption: 3,
        marks: 10
      }
    ]
  },
  {
    quizId: "DSA102",
    title: "Data Structures & Algorithms",
    description: "Stacks, Queues, HashMaps, and Complexity",
    questions: [
      {
        id: 1,
        questionText: "What is the average time complexity of get(key) and put(key, value) in a HashMap?",
        options: ["O(n)", "O(log n)", "O(1)", "O(n log n)"],
        correctOption: 3,
        marks: 10
      },
      {
        id: 2,
        questionText: "Which data structure follows the LIFO (Last In First Out) principle?",
        options: ["Queue", "Stack", "Binary Search Tree", "Linked List"],
        correctOption: 2,
        marks: 10
      },
      {
        id: 3,
        questionText: "Which data structure is primarily used for implementing Breadth-First Search (BFS)?",
        options: ["Stack", "Queue", "Heap", "PriorityQueue"],
        correctOption: 2,
        marks: 10
      },
      {
        id: 4,
        questionText: "What is the worst-case time complexity of searching in a balanced Binary Search Tree (AVL Tree)?",
        options: ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
        correctOption: 3,
        marks: 10
      }
    ]
  }
];

const INITIAL_RESULTS = [
  {
    attemptId: "ATT-SEED01",
    student: { studentId: "STU001", name: "Alice Smith" },
    quizId: "JAVA101",
    quizTitle: "Core Java Programming",
    score: 50,
    totalPossibleMarks: 50,
    percentage: 100.0,
    completedAt: "2026-10-01 10:15:00",
    answers: []
  },
  {
    attemptId: "ATT-SEED02",
    student: { studentId: "STU002", name: "Bob Johnson" },
    quizId: "JAVA101",
    quizTitle: "Core Java Programming",
    score: 40,
    totalPossibleMarks: 50,
    percentage: 80.0,
    completedAt: "2026-10-01 10:30:00",
    answers: []
  },
  {
    attemptId: "ATT-SEED03",
    student: { studentId: "STU003", name: "Charlie Brown" },
    quizId: "JAVA101",
    quizTitle: "Core Java Programming",
    score: 30,
    totalPossibleMarks: 50,
    percentage: 60.0,
    completedAt: "2026-10-01 11:00:00",
    answers: []
  },
  {
    attemptId: "ATT-SEED04",
    student: { studentId: "STU004", name: "Diana Prince" },
    quizId: "DSA102",
    quizTitle: "Data Structures & Algorithms",
    score: 40,
    totalPossibleMarks: 40,
    percentage: 100.0,
    completedAt: "2026-10-01 11:20:00",
    answers: []
  }
];

// State Management
class QuizStore {
  constructor() {
    this.quizzes = this.loadQuizzes();
    this.results = this.loadResults();
    this.currentStudent = this.loadCurrentStudent();
  }

  loadQuizzes() {
    const raw = localStorage.getItem("qs_quizzes");
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(INITIAL_QUIZZES));
  }

  saveQuizzes() {
    localStorage.setItem("qs_quizzes", JSON.stringify(this.quizzes));
    renderAllViews();
  }

  loadResults() {
    const raw = localStorage.getItem("qs_results");
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(INITIAL_RESULTS));
  }

  saveResults() {
    localStorage.setItem("qs_results", JSON.stringify(this.results));
    renderAllViews();
  }

  loadCurrentStudent() {
    const raw = localStorage.getItem("qs_current_student");
    return raw ? JSON.parse(raw) : { studentId: "STU-DEMO", name: "Alex Morgan" };
  }

  saveCurrentStudent(student) {
    this.currentStudent = student;
    localStorage.setItem("qs_current_student", JSON.stringify(student));
    renderStudentProfile();
  }

  // Quiz CRUD
  getQuiz(quizId) {
    return this.quizzes.find(q => q.quizId === quizId);
  }

  addQuiz(quiz) {
    this.quizzes.push(quiz);
    this.saveQuizzes();
  }

  // Question CRUD (Emulating HashMap<Integer, Question>)
  addQuestion(quizId, question) {
    const quiz = this.getQuiz(quizId);
    if (!quiz) return false;
    quiz.questions.push(question);
    this.saveQuizzes();
    return true;
  }

  updateQuestion(quizId, questionId, updatedData) {
    const quiz = this.getQuiz(quizId);
    if (!quiz) return false;
    const index = quiz.questions.findIndex(q => q.id === questionId);
    if (index === -1) return false;
    quiz.questions[index] = { ...quiz.questions[index], ...updatedData };
    this.saveQuizzes();
    return true;
  }

  deleteQuestion(quizId, questionId) {
    const quiz = this.getQuiz(quizId);
    if (!quiz) return false;
    quiz.questions = quiz.questions.filter(q => q.id !== questionId);
    this.saveQuizzes();
    return true;
  }

  recordAttempt(result) {
    this.results.push(result);
    this.saveResults();
  }
}

const store = new QuizStore();

// Quiz Runner Session State (Queue & Stack)
let activeQuizSession = null;
let quizTimerInterval = null;

// =========================================================================
// NAVIGATION & TABS
// =========================================================================

function initNav() {
  const buttons = document.querySelectorAll(".nav-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      switchTab(tabId);
    });
  });
}

function switchTab(tabId) {
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));

  const targetBtn = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
  const targetContent = document.getElementById(tabId);

  if (targetBtn) targetBtn.classList.add("active");
  if (targetContent) targetContent.classList.add("active");

  renderAllViews();
}

// =========================================================================
// RENDERERS
// =========================================================================

function renderAllViews() {
  renderDashboard();
  renderStudentView();
  renderAdminView();
  renderLeaderboard();
  renderInspector();
}

function renderDashboard() {
  // Stats
  const quizCount = store.quizzes.length;
  let totalQuestions = 0;
  store.quizzes.forEach(q => totalQuestions += q.questions.length);
  const attemptsCount = store.results.length;

  let highestScore = 0;
  let highestPossible = 0;
  store.results.forEach(r => {
    if (r.score > highestScore) {
      highestScore = r.score;
      highestPossible = r.totalPossibleMarks;
    }
  });

  document.getElementById("dash-quiz-count").innerText = quizCount;
  document.getElementById("dash-question-count").innerText = totalQuestions;
  document.getElementById("dash-attempts-count").innerText = attemptsCount;
  document.getElementById("dash-top-score").innerText = highestPossible > 0 ? `${highestScore}/${highestPossible}` : "0";

  // Dashboard Quiz Grid
  const list = document.getElementById("dashboard-quiz-list");
  list.innerHTML = "";
  store.quizzes.forEach(quiz => {
    const totalMarks = quiz.questions.reduce((sum, q) => sum + (q.marks || 10), 0);
    const card = document.createElement("div");
    card.className = "quiz-card";
    card.innerHTML = `
      <div>
        <div class="quiz-card-header">
          <span class="badge badge-primary">${quiz.quizId}</span>
          <span class="badge badge-neutral">${quiz.questions.length} Questions</span>
        </div>
        <h3>${escapeHtml(quiz.title)}</h3>
        <p>${escapeHtml(quiz.description || "Comprehensive evaluation assessment.")}</p>
      </div>
      <div>
        <div class="quiz-card-meta">
          <span>🎯 Total Marks: <strong>${totalMarks}</strong></span>
        </div>
        <button class="btn btn-primary" style="width: 100%;" onclick="startQuiz('${quiz.quizId}')">
          Start Quiz Now →
        </button>
      </div>
    `;
    list.appendChild(card);
  });
}

function renderStudentProfile() {
  const nameEl = document.getElementById("student-name-display");
  const idEl = document.getElementById("student-id-display");
  const avatarEl = document.getElementById("student-avatar");

  if (nameEl) nameEl.innerText = store.currentStudent.name;
  if (idEl) idEl.innerText = `ID: ${store.currentStudent.studentId}`;
  if (avatarEl) avatarEl.innerText = (store.currentStudent.name || "S")[0].toUpperCase();
}

function renderStudentView() {
  renderStudentProfile();

  // Student Quiz Selection Cards
  const list = document.getElementById("student-quiz-list");
  list.innerHTML = "";
  store.quizzes.forEach(quiz => {
    const totalMarks = quiz.questions.reduce((sum, q) => sum + (q.marks || 10), 0);
    const card = document.createElement("div");
    card.className = "quiz-card";
    card.innerHTML = `
      <div>
        <div class="quiz-card-header">
          <span class="badge badge-primary">${quiz.quizId}</span>
          <span class="badge badge-success">${totalMarks} Marks</span>
        </div>
        <h3>${escapeHtml(quiz.title)}</h3>
        <p>${escapeHtml(quiz.description || "Self-assessment quiz.")}</p>
      </div>
      <div>
        <div class="quiz-card-meta">
          <span>📋 ${quiz.questions.length} MCQs</span>
        </div>
        <button class="btn btn-primary" style="width: 100%;" onclick="startQuiz('${quiz.quizId}')" ${quiz.questions.length === 0 ? "disabled" : ""}>
          ${quiz.questions.length === 0 ? "No Questions Added" : "Attempt Assessment"}
        </button>
      </div>
    `;
    list.appendChild(card);
  });

  // Student Past Attempts Table
  const historyContainer = document.getElementById("student-history-table-container");
  const myAttempts = store.results.filter(
    r => r.student.studentId.toUpperCase() === store.currentStudent.studentId.toUpperCase()
  );

  if (myAttempts.length === 0) {
    historyContainer.innerHTML = `<p style="color: var(--text-muted); padding: 12px 0;">You have not taken any quizzes yet. Click "Attempt Assessment" above to test your skills!</p>`;
  } else {
    historyContainer.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Attempt ID</th>
              <th>Quiz</th>
              <th>Score</th>
              <th>Percentage</th>
              <th>Completed At</th>
            </tr>
          </thead>
          <tbody>
            ${myAttempts.map(att => `
              <tr>
                <td><code>${att.attemptId}</code></td>
                <td><strong>${escapeHtml(att.quizTitle)}</strong> (${att.quizId})</td>
                <td><span class="badge badge-neutral">${att.score} / ${att.totalPossibleMarks}</span></td>
                <td><strong>${att.percentage.toFixed(1)}%</strong></td>
                <td>${att.completedAt}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
}

// =========================================================================
// QUIZ RUNNER (QUEUE & STACK ENGINE)
// =========================================================================

function startQuiz(quizId) {
  const quiz = store.getQuiz(quizId);
  if (!quiz || quiz.questions.length === 0) {
    showToast("This quiz contains no questions yet.");
    return;
  }

  // DATA STRUCTURES:
  // 1. questionQueue (LinkedList emulation) -> Stores questions to serve sequentially
  // 2. answerStack (ArrayDeque emulation) -> Stores answers submitted for LIFO backtracking
  activeQuizSession = {
    quiz: quiz,
    questionQueue: [...quiz.questions], // Queue: FIFO
    answerStack: [],                    // Stack: LIFO
    currentQuestionIndex: 0,
    selectedOption: null,
    startTime: Date.now()
  };

  // Switch to Student tab and reveal runner
  switchTab("tab-student");
  document.getElementById("quiz-selection-container").style.display = "none";
  document.getElementById("quiz-runner-container").style.display = "block";

  // Start Timer
  startQuizTimer();

  // Render first question
  renderCurrentQuestion();
}

function startQuizTimer() {
  if (quizTimerInterval) clearInterval(quizTimerInterval);
  const timerEl = document.getElementById("runner-timer");
  const start = Date.now();

  quizTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - start) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    if (timerEl) timerEl.innerText = `${mins}:${secs}`;
  }, 1000);
}

function renderCurrentQuestion() {
  const session = activeQuizSession;
  const totalQuestions = session.quiz.questions.length;
  const currentIdx = session.currentQuestionIndex;
  const question = session.quiz.questions[currentIdx];

  // Headers & Badges
  document.getElementById("runner-quiz-badge").innerText = session.quiz.quizId;
  document.getElementById("runner-quiz-title").innerText = session.quiz.title;
  document.getElementById("runner-score-badge").innerText = `Marks: ${question.marks || 10}`;

  // Progress
  const pct = Math.round(((currentIdx + 1) / totalQuestions) * 100);
  document.getElementById("runner-progress-text").innerText = `Question ${currentIdx + 1} of ${totalQuestions}`;
  document.getElementById("runner-progress-pct").innerText = `${pct}%`;
  document.getElementById("runner-progress-fill").style.width = `${pct}%`;

  // Question Text
  document.getElementById("runner-q-id").innerText = `Q${question.id}`;
  document.getElementById("runner-q-text").innerText = question.questionText;

  // Options
  const optionsList = document.getElementById("runner-options-list");
  optionsList.innerHTML = "";

  // Check if we previously answered this question (e.g. from backtracked state)
  const prevAnswer = session.answerStack[currentIdx];
  session.selectedOption = prevAnswer ? prevAnswer.selectedOption : null;

  question.options.forEach((optText, i) => {
    const optionNum = i + 1;
    const letter = String.fromCharCode(65 + i);
    const item = document.createElement("div");
    item.className = "option-item" + (session.selectedOption === optionNum ? " selected" : "");
    item.onclick = () => selectOption(optionNum);

    item.innerHTML = `
      <div class="option-letter">${letter}</div>
      <div class="option-text">${escapeHtml(optText)}</div>
    `;
    optionsList.appendChild(item);
  });

  // Buttons state
  const prevBtn = document.getElementById("btn-quiz-prev");
  const nextBtn = document.getElementById("btn-quiz-next");

  prevBtn.disabled = (currentIdx === 0);
  if (currentIdx === totalQuestions - 1) {
    nextBtn.innerText = "Finish & Submit Quiz ✓";
  } else {
    nextBtn.innerText = "Next Question →";
  }

  // Update live DS Inspector view
  renderInspector();
}

function selectOption(optNum) {
  if (!activeQuizSession) return;
  activeQuizSession.selectedOption = optNum;

  const items = document.querySelectorAll("#runner-options-list .option-item");
  items.forEach((item, idx) => {
    if (idx + 1 === optNum) {
      item.classList.add("selected");
    } else {
      item.classList.remove("selected");
    }
  });
}

function handleNextQuestion() {
  saveAnswerAndAdvance(activeQuizSession.selectedOption);
}

function handleSkipQuestion() {
  saveAnswerAndAdvance(null);
}

function saveAnswerAndAdvance(chosenOption) {
  const session = activeQuizSession;
  const currentIdx = session.currentQuestionIndex;
  const question = session.quiz.questions[currentIdx];

  const isCorrect = (chosenOption === question.correctOption);
  const pointsEarned = isCorrect ? (question.marks || 10) : 0;

  const answerRecord = {
    question: question,
    selectedOption: chosenOption,
    isCorrect: isCorrect,
    pointsEarned: pointsEarned
  };

  // Stack operation: Push answer
  session.answerStack[currentIdx] = answerRecord;

  // Advance
  if (currentIdx < session.quiz.questions.length - 1) {
    session.currentQuestionIndex++;
    session.selectedOption = null;
    renderCurrentQuestion();
  } else {
    // End of quiz
    finalizeQuizSession();
  }
}

function handlePreviousQuestion() {
  const session = activeQuizSession;
  if (!session || session.currentQuestionIndex === 0) return;

  // Backtracking in Stack: pop/step backwards
  session.currentQuestionIndex--;
  renderCurrentQuestion();
}

function finalizeQuizSession() {
  if (quizTimerInterval) clearInterval(quizTimerInterval);

  const session = activeQuizSession;
  const quiz = session.quiz;
  const answers = session.answerStack;

  let totalScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let totalPossible = 0;

  quiz.questions.forEach((q, idx) => {
    totalPossible += (q.marks || 10);
    const ans = answers[idx];
    if (ans && ans.isCorrect) {
      totalScore += ans.pointsEarned;
      correctCount++;
    } else {
      wrongCount++;
    }
  });

  const percentage = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
  const attemptId = "ATT-" + Math.random().toString(36).substring(2, 8).toUpperCase();

  const now = new Date();
  const dateStr = now.toISOString().replace("T", " ").substring(0, 19);

  const result = {
    attemptId: attemptId,
    student: { ...store.currentStudent },
    quizId: quiz.quizId,
    quizTitle: quiz.title,
    score: totalScore,
    totalPossibleMarks: totalPossible,
    correctCount: correctCount,
    wrongCount: wrongCount,
    percentage: percentage,
    completedAt: dateStr,
    answers: answers
  };

  // Record in store (updates Leaderboard with PriorityQueue logic)
  store.recordAttempt(result);

  // Reset runner view
  document.getElementById("quiz-runner-container").style.display = "none";
  document.getElementById("quiz-selection-container").style.display = "block";
  activeQuizSession = null;

  // Show Result Modal
  displayResultModal(result);
}

function displayResultModal(res) {
  document.getElementById("res-score-val").innerText = res.score;
  document.getElementById("res-total-val").innerText = `/ ${res.totalPossibleMarks}`;
  document.getElementById("res-student-header").innerText = `${res.student.name} (${res.student.studentId})`;
  document.getElementById("res-quiz-header").innerText = `${res.quizTitle} [${res.quizId}]`;

  document.getElementById("res-stat-total").innerText = res.answers.length;
  document.getElementById("res-stat-correct").innerText = res.correctCount;
  document.getElementById("res-stat-wrong").innerText = res.wrongCount;
  document.getElementById("res-stat-pct").innerText = `${res.percentage.toFixed(1)}%`;

  const gradeEl = document.getElementById("res-grade-badge");
  if (res.percentage >= 85) {
    gradeEl.className = "badge badge-success badge-lg";
    gradeEl.innerText = `Grade A+ (${res.percentage.toFixed(1)}%) - Excellent!`;
  } else if (res.percentage >= 70) {
    gradeEl.className = "badge badge-primary badge-lg";
    gradeEl.innerText = `Grade A (${res.percentage.toFixed(1)}%) - Great Job!`;
  } else if (res.percentage >= 50) {
    gradeEl.className = "badge badge-warning badge-lg";
    gradeEl.innerText = `Grade B (${res.percentage.toFixed(1)}%) - Passed`;
  } else {
    gradeEl.className = "badge badge-neutral badge-lg";
    gradeEl.innerText = `Grade C (${res.percentage.toFixed(1)}%) - Needs Improvement`;
  }

  // Detailed Question Review
  const reviewList = document.getElementById("res-review-list");
  reviewList.innerHTML = "";
  res.answers.forEach((ans, idx) => {
    const q = ans.question;
    const item = document.createElement("div");
    item.className = "review-item " + (ans.isCorrect ? "correct" : "");

    const studentOptText = (ans.selectedOption != null)
      ? `[${String.fromCharCode(65 + ans.selectedOption - 1)}] ${q.options[ans.selectedOption - 1]}`
      : `Skipped`;

    const correctOptText = `[${String.fromCharCode(65 + q.correctOption - 1)}] ${q.options[q.correctOption - 1]}`;

    item.innerHTML = `
      <h5>Q${idx + 1}: ${escapeHtml(q.questionText)}</h5>
      <p>Your Answer: <strong>${escapeHtml(studentOptText)}</strong></p>
      <p>Correct Answer: <strong style="color: var(--success);">${escapeHtml(correctOptText)}</strong></p>
      <span class="badge ${ans.isCorrect ? 'badge-success' : 'badge-neutral'}" style="margin-top: 6px;">
        ${ans.isCorrect ? `+${ans.pointsEarned} Marks (Correct)` : `+0 Marks (Incorrect)`}
      </span>
    `;
    reviewList.appendChild(item);
  });

  openModal("modal-quiz-result");
}

function goToLeaderboardFromResults() {
  closeModal("modal-quiz-result");
  switchTab("tab-leaderboard");
}

// =========================================================================
// ADMINISTRATOR PORTAL (CRUD ON QUESTIONS & QUIZZES)
// =========================================================================

let currentAdminQuizId = null;

function renderAdminView() {
  // Populate Quiz Selector
  const selector = document.getElementById("admin-quiz-selector");
  if (!selector) return;

  const prevSelected = currentAdminQuizId || selector.value;
  selector.innerHTML = "";

  store.quizzes.forEach(q => {
    const opt = document.createElement("option");
    opt.value = q.quizId;
    opt.innerText = `${q.quizId} - ${q.title}`;
    selector.appendChild(opt);
  });

  if (store.quizzes.some(q => q.quizId === prevSelected)) {
    selector.value = prevSelected;
    currentAdminQuizId = prevSelected;
  } else if (store.quizzes.length > 0) {
    currentAdminQuizId = store.quizzes[0].quizId;
    selector.value = currentAdminQuizId;
  }

  onAdminQuizSelected();
}

function onAdminQuizSelected() {
  const selector = document.getElementById("admin-quiz-selector");
  currentAdminQuizId = selector.value;

  const quiz = store.getQuiz(currentAdminQuizId);
  const metaEl = document.getElementById("admin-quiz-meta");
  const countEl = document.getElementById("admin-question-count");
  const tbody = document.getElementById("admin-questions-tbody");

  if (!quiz) {
    metaEl.innerHTML = "";
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No quiz selected.</td></tr>`;
    return;
  }

  const totalMarks = quiz.questions.reduce((sum, q) => sum + (q.marks || 10), 0);
  metaEl.innerHTML = `
    <span class="badge badge-primary">${quiz.quizId}</span>
    <span class="badge badge-neutral">${quiz.questions.length} Questions</span>
    <span class="badge badge-success">${totalMarks} Marks</span>
  `;
  countEl.innerText = quiz.questions.length;

  // Render Questions in HashMap table
  tbody.innerHTML = "";
  if (quiz.questions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">No questions in this quiz. Click "+ Add New Question" above.</td></tr>`;
    return;
  }

  quiz.questions.forEach((q) => {
    const tr = document.createElement("tr");
    const optionsHtml = q.options.map((opt, i) => {
      const isCorrect = (i + 1 === q.correctOption);
      const letter = String.fromCharCode(65 + i);
      return `<span style="${isCorrect ? 'color: var(--success); font-weight: bold;' : 'color: var(--text-secondary);'}">
        [${letter}] ${escapeHtml(opt)}${isCorrect ? ' ✓' : ''}
      </span>`;
    }).join("<br>");

    tr.innerHTML = `
      <td><code>#${q.id}</code></td>
      <td><strong>${escapeHtml(q.questionText)}</strong></td>
      <td><div style="font-size: 0.85rem; line-height: 1.4;">${optionsHtml}</div></td>
      <td><span class="badge badge-neutral">${q.marks || 10}</span></td>
      <td style="text-align: right;">
        <button class="btn btn-secondary btn-sm" onclick="openEditQuestionModal(${q.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="handleDeleteQuestion(${q.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openCreateQuizModal() {
  document.getElementById("form-create-quiz").reset();
  openModal("modal-create-quiz");
}

function handleCreateQuiz(e) {
  e.preventDefault();
  const quizId = document.getElementById("input-quiz-id").value.trim().toUpperCase();
  const title = document.getElementById("input-quiz-title").value.trim();
  const desc = document.getElementById("input-quiz-desc").value.trim();

  if (store.getQuiz(quizId)) {
    showToast(`Quiz ID '${quizId}' already exists!`);
    return;
  }

  store.addQuiz({
    quizId: quizId,
    title: title,
    description: desc,
    questions: []
  });

  closeModal("modal-create-quiz");
  showToast(`Quiz '${quizId}' created successfully!`);
  currentAdminQuizId = quizId;
  renderAdminView();
}

function openAddQuestionModal() {
  const form = document.getElementById("form-question-editor");
  form.reset();
  document.getElementById("modal-question-title").innerText = "Add Multiple-Choice Question";
  document.getElementById("edit-question-id").value = "";

  // Populate Quiz Dropdown in Modal
  const quizSelect = document.getElementById("input-q-quiz");
  quizSelect.innerHTML = "";
  store.quizzes.forEach(q => {
    const opt = document.createElement("option");
    opt.value = q.quizId;
    opt.innerText = `${q.quizId} - ${q.title}`;
    if (q.quizId === currentAdminQuizId) opt.selected = true;
    quizSelect.appendChild(opt);
  });

  openModal("modal-question-editor");
}

function openEditQuestionModal(questionId) {
  const quiz = store.getQuiz(currentAdminQuizId);
  if (!quiz) return;
  const q = quiz.questions.find(item => item.id === questionId);
  if (!q) return;

  document.getElementById("modal-question-title").innerText = `Edit Question #${q.id}`;
  document.getElementById("edit-question-id").value = q.id;

  const quizSelect = document.getElementById("input-q-quiz");
  quizSelect.innerHTML = `<option value="${quiz.quizId}" selected>${quiz.quizId} - ${quiz.title}</option>`;
  quizSelect.disabled = true;

  document.getElementById("input-q-marks").value = q.marks || 10;
  document.getElementById("input-q-text").value = q.questionText;

  // Options
  for (let i = 1; i <= 4; i++) {
    const input = document.getElementById(`input-opt-${i}`);
    if (input) input.value = q.options[i - 1] || "";
  }

  // Radio button for correct option
  const radio = document.querySelector(`input[name="correct-option-radio"][value="${q.correctOption}"]`);
  if (radio) radio.checked = true;

  openModal("modal-question-editor");
}

function handleSaveQuestion(e) {
  e.preventDefault();
  const editIdStr = document.getElementById("edit-question-id").value;
  const quizId = document.getElementById("input-q-quiz").value;
  const marks = parseInt(document.getElementById("input-q-marks").value) || 10;
  const qText = document.getElementById("input-q-text").value.trim();

  const options = [];
  for (let i = 1; i <= 4; i++) {
    options.push(document.getElementById(`input-opt-${i}`).value.trim());
  }

  const correctRadio = document.querySelector('input[name="correct-option-radio"]:checked');
  const correctOption = correctRadio ? parseInt(correctRadio.value) : 1;

  if (editIdStr) {
    // Update existing question
    const qId = parseInt(editIdStr);
    store.updateQuestion(quizId, qId, {
      questionText: qText,
      options: options,
      correctOption: correctOption,
      marks: marks
    });
    showToast(`Question #${qId} updated successfully.`);
  } else {
    // Add new question
    const quiz = store.getQuiz(quizId);
    const nextId = quiz.questions.reduce((max, item) => item.id > max ? item.id : max, 0) + 1;
    store.addQuestion(quizId, {
      id: nextId,
      questionText: qText,
      options: options,
      correctOption: correctOption,
      marks: marks
    });
    showToast(`Question #${nextId} added to quiz ${quizId}.`);
  }

  closeModal("modal-question-editor");
  renderAdminView();
}

function handleDeleteQuestion(questionId) {
  if (confirm(`Are you sure you want to delete Question #${questionId}?`)) {
    store.deleteQuestion(currentAdminQuizId, questionId);
    showToast(`Question #${questionId} deleted.`);
    renderAdminView();
  }
}

// =========================================================================
// LEADERBOARD (PRIORITYQUEUE MAX-HEAP LOGIC)
// =========================================================================

function renderLeaderboard() {
  const filterEl = document.getElementById("leaderboard-filter");
  if (!filterEl) return;

  // Sync quiz options in filter
  const curVal = filterEl.value;
  filterEl.innerHTML = `<option value="GLOBAL">🌐 Global Leaderboard (All Quizzes)</option>`;
  store.quizzes.forEach(q => {
    const opt = document.createElement("option");
    opt.value = q.quizId;
    opt.innerText = `Quiz: ${q.title} (${q.quizId})`;
    filterEl.appendChild(opt);
  });
  filterEl.value = curVal || "GLOBAL";

  const selectedTarget = filterEl.value;

  // Filter results
  let filtered = [...store.results];
  if (selectedTarget !== "GLOBAL") {
    filtered = filtered.filter(r => r.quizId === selectedTarget);
  }

  // PriorityQueue Max-Heap logic:
  // Sort descending by score, tie-break by earlier completion time
  filtered.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return new Date(a.completedAt) - new Date(b.completedAt);
  });

  // Podium (Top 3)
  const podiumEl = document.getElementById("leaderboard-podium");
  if (filtered.length === 0) {
    podiumEl.innerHTML = `<p style="color: var(--text-muted); padding: 20px;">No attempt records available for this assessment.</p>`;
  } else {
    const top1 = filtered[0];
    const top2 = filtered[1];
    const top3 = filtered[2];

    podiumEl.innerHTML = `
      ${top2 ? renderPodiumCard(top2, "silver", "🥈", "2nd Place") : ""}
      ${top1 ? renderPodiumCard(top1, "gold", "🥇", "Champion") : ""}
      ${top3 ? renderPodiumCard(top3, "bronze", "🥉", "3rd Place") : ""}
    `;
  }

  // Table
  const tbody = document.getElementById("leaderboard-tbody");
  tbody.innerHTML = "";
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No records found.</td></tr>`;
    return;
  }

  filtered.forEach((res, idx) => {
    const rank = idx + 1;
    let rankBadge = `${rank}`;
    if (rank === 1) rankBadge = `<span class="badge badge-warning">🥇 1st</span>`;
    else if (rank === 2) rankBadge = `<span class="badge badge-neutral">🥈 2nd</span>`;
    else if (rank === 3) rankBadge = `<span class="badge badge-neutral">🥉 3rd</span>`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${rankBadge}</strong></td>
      <td>
        <strong>${escapeHtml(res.student.name)}</strong>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${res.student.studentId}</div>
      </td>
      <td>${escapeHtml(res.quizTitle || res.quizId)}</td>
      <td><span class="badge badge-primary">${res.score} / ${res.totalPossibleMarks}</span></td>
      <td><strong>${res.percentage.toFixed(1)}%</strong></td>
      <td>${getGradeBadge(res.percentage)}</td>
      <td><span style="font-size: 0.8rem; color: var(--text-secondary);">${res.completedAt}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPodiumCard(res, type, medal, title) {
  return `
    <div class="podium-card ${type}">
      <div class="podium-medal">${medal}</div>
      <div class="podium-name">${escapeHtml(res.student.name)}</div>
      <div class="podium-id">${res.student.studentId}</div>
      <div class="podium-score">${res.score} / ${res.totalPossibleMarks}</div>
      <div class="podium-pct">${res.percentage.toFixed(1)}% Score</div>
    </div>
  `;
}

function getGradeBadge(pct) {
  if (pct >= 85) return `<span class="badge badge-success">A+</span>`;
  if (pct >= 70) return `<span class="badge badge-primary">A</span>`;
  if (pct >= 50) return `<span class="badge badge-warning">B</span>`;
  return `<span class="badge badge-neutral">C</span>`;
}

// =========================================================================
// DATA STRUCTURES INSPECTOR
// =========================================================================

function renderInspector() {
  const hashmapEl = document.getElementById("inspector-hashmap-view");
  const queueEl = document.getElementById("inspector-queue-view");
  const stackEl = document.getElementById("inspector-stack-view");
  const heapEl = document.getElementById("inspector-heap-view");

  // 1. HashMap State
  const currentQuiz = store.getQuiz(currentAdminQuizId || "JAVA101");
  if (currentQuiz && hashmapEl) {
    const mapObj = {};
    currentQuiz.questions.forEach(q => {
      mapObj[`Key (ID: ${q.id})`] = {
        prompt: q.questionText.substring(0, 38) + "...",
        correctAnswer: `Option [${String.fromCharCode(65 + q.correctOption - 1)}]`,
        marks: q.marks || 10
      };
    });
    hashmapEl.innerText = JSON.stringify(mapObj, null, 2);
  }

  // 2. Queue State
  if (queueEl) {
    if (activeQuizSession) {
      const remaining = activeQuizSession.quiz.questions.slice(activeQuizSession.currentQuestionIndex);
      queueEl.innerText = `FRONT OF QUEUE (FIFO):\n` +
        remaining.map((q, idx) => ` [${idx === 0 ? "HEAD" : idx}] Q${q.id}: ${q.questionText.substring(0, 32)}...`).join("\n");
    } else {
      queueEl.innerText = `[Queue Inactive]\nStart a quiz from the Student Portal to watch questions dequeued sequentially in FIFO order.`;
    }
  }

  // 3. Stack State
  if (stackEl) {
    if (activeQuizSession && activeQuizSession.answerStack.length > 0) {
      const stackReversed = [...activeQuizSession.answerStack].reverse();
      stackEl.innerText = `TOP OF STACK (LIFO Backtracking):\n` +
        stackReversed.map((ans, idx) => ` [TOP-${idx}] Q${ans.question.id} -> Answer: ${ans.selectedOption != null ? 'Opt ' + ans.selectedOption : 'Skipped'} (${ans.isCorrect ? 'Correct' : 'Wrong'})`).join("\n");
    } else {
      stackEl.innerText = `[Stack Empty]\nAs you answer questions during a quiz, responses are pushed onto the Stack to enable answer review.`;
    }
  }

  // 4. PriorityQueue Max-Heap State
  if (heapEl) {
    const sorted = [...store.results].sort((a, b) => b.score - a.score);
    heapEl.innerText = `MAX-HEAP ROOT (Highest Score First):\n` +
      sorted.slice(0, 4).map((r, idx) => ` [Rank #${idx + 1}] ${r.student.name} - Score: ${r.score}/${r.totalPossibleMarks} (${r.quizId})`).join("\n");
  }
}

// =========================================================================
// MODALS & UTILITIES
// =========================================================================

function promptStudentProfile() {
  document.getElementById("input-student-id").value = store.currentStudent.studentId;
  document.getElementById("input-student-name").value = store.currentStudent.name;
  openModal("modal-student-profile");
}

function saveStudentProfile(e) {
  e.preventDefault();
  const id = document.getElementById("input-student-id").value.trim();
  const name = document.getElementById("input-student-name").value.trim();
  if (id && name) {
    store.saveCurrentStudent({ studentId: id, name: name });
    closeModal("modal-student-profile");
    showToast(`Logged in as ${name} (${id})`);
  }
}

function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add("active");
}

function closeModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove("active");
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.innerText = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  initNav();
  renderAllViews();
});
