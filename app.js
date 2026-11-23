
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbz_tASkriYHt3K4bHQrXs-MSwaEZTzKlViYlSXezHpP1NOhwtfV0Z4EodJRXhqFHpAsUw/exec";

const medicineData = {
  paracetamol: { name: "พาราเซตามอล" },
  carminative: { name: "ยาแก้ท้องอืด (รอเจ้าหน้าที่พิจารณา)" },
  ors: { name: "ผงเกลือแร่ ORS (รอเจ้าหน้าที่พิจารณา)" },
  antacid: { name: "ยาลดกรด (รอเจ้าหน้าที่พิจารณา)" }
};

const symptomCareMap = {
  headache: { medicine: "paracetamol", label: "ปวดหัว" },
  stomachache: { medicine: "carminative", label: "ปวดท้อง/ท้องอืด" },
  diarrhea: { medicine: "ors", label: "ท้องเสียเล็กน้อย" },
  indigestion: { medicine: "antacid", label: "แสบท้อง/อาหารไม่ย่อย" },
  migraine: {
    label: "สงสัยไมเกรน",
    referral: true,
    message: "กรุณาแจ้งเจ้าหน้าที่ห้องพยาบาลเพื่อประเมินอาการไมเกรน"
  }
};

const medicineForm = document.getElementById("medicineForm");
const medicineSelect = document.getElementById("medicine");
const symptomSelect = document.getElementById("symptom");
const careSummary = document.getElementById("careSummary");
const careSummaryText = document.getElementById("careSummaryText");

const message = document.getElementById("message");
const submitButton = document.getElementById("submitBtn");

const formView = document.getElementById("formView");
const successView = document.getElementById("successView");
const backButton = document.getElementById("backButton");
const registrationView = document.getElementById("registrationView");
const registrationForm = document.getElementById("registrationForm");
const registrationName = document.getElementById("registrationName");
const registrationStudentId = document.getElementById("registrationStudentId");
const registrationProgram = document.getElementById("registrationProgram");
const registrationLevel = document.getElementById("registrationLevel");
const registrationPhone = document.getElementById("registrationPhone");
const registrationSubmitButton = document.getElementById("registrationSubmitButton");
const loginButton = document.getElementById("loginButton");
const showRegistrationButton = document.getElementById("showRegistrationButton");
const backToLoginButton = document.getElementById("backToLoginButton");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const registrationOnlyGroups = document.querySelectorAll(".auth-registration-only");
const registrationMessage = document.getElementById("registrationMessage");
const signOutButton = document.getElementById("signOutButton");

const MEMBER_STORAGE_KEY = "medicineBoxMember";

// เก็บรหัสเดิมไว้เมื่อส่งข้อมูลแล้วเครือข่ายขัดข้อง
let currentSubmissionId = null;

function normalizeStudentId(studentId) {
  return String(studentId || "").replace(/[\s\u200B-\u200F\u2060\uFEFF-]/g, "");
}

function isValidStudentId(studentId) {
  return /^\d{5,15}$/.test(normalizeStudentId(studentId));
}

async function postAction(action, data = {}) {
  const formData = new URLSearchParams();
  formData.append("action", action);

  Object.entries(data).forEach(function ([key, value]) {
    formData.append(key, value);
  });

  const response = await fetch(SCRIPT_URL, {
    method: "POST",
    mode: "cors",
    redirect: "follow",
    body: formData
  });

  if (!response.ok) {
    throw new Error("เซิร์ฟเวอร์ไม่สามารถรับข้อมูลได้");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "ไม่สามารถดำเนินการได้");
  }

  return result;
}

function showRegistrationMessage(text, type) {
  registrationMessage.textContent = text;
  registrationMessage.className = "message " + type;
}

function setAuthMode(mode) {
  const isSignup = mode === "signup";

  registrationView.dataset.authMode = isSignup ? "signup" : "login";
  authTitle.textContent = isSignup ? "สมัครสมาชิก" : "เข้าสู่ระบบ";
  authSubtitle.textContent = isSignup
    ? "กรอกข้อมูลให้ครบถ้วนเพื่อลงทะเบียนใช้งาน"
    : "กรอกรหัสนักศึกษาและเบอร์โทรเพื่อเข้าสู่ระบบ";

  registrationOnlyGroups.forEach(function (group) {
    group.hidden = !isSignup;
  });

  registrationName.required = isSignup;
  registrationProgram.required = isSignup;
  registrationLevel.required = isSignup;
  loginButton.hidden = isSignup;
  showRegistrationButton.hidden = isSignup;
  registrationSubmitButton.hidden = !isSignup;
  backToLoginButton.hidden = !isSignup;
}

function showSignupForNewMember() {
  const studentId = normalizeStudentId(registrationStudentId.value);
  const phone = String(registrationPhone.value || "").replace(/\D/g, "");

  setAuthMode("signup");
  registrationStudentId.value = studentId;
  registrationPhone.value = phone;
  showRegistrationMessage("ยังไม่พบข้อมูลสมาชิก กรุณากรอกข้อมูลเพื่อลงทะเบียนใช้งาน", "warning");
}

function showRegistrationView() {
  setAuthMode("login");
  registrationView.hidden = false;
  formView.hidden = true;
  successView.hidden = true;
  signOutButton.hidden = true;
}

function showRequestView(member) {
  document.getElementById("studentId").value = member.studentId;
  document.getElementById("name").value = member.name;
  document.getElementById("profileName").textContent = member.name;
  document.getElementById("profileStudentId").textContent = member.studentId;
  document.getElementById("profileProgram").textContent = member.program || "-";
  document.getElementById("profileLevel").textContent = member.level || "-";
  document.getElementById("profilePhone").textContent = member.phone || "-";

  registrationView.hidden = true;
  formView.hidden = false;
  successView.hidden = true;
  signOutButton.hidden = false;
}

function saveMemberSession(member) {
  localStorage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(member));
}

function getSavedMember() {
  try {
    const stored = localStorage.getItem(MEMBER_STORAGE_KEY);
    if (!stored) return null;

    const member = JSON.parse(stored);
    if (!member.name || !member.studentId) return null;
    return member;
  } catch (error) {
    return null;
  }
}

function clearRequestFields() {
  document.getElementById("room").value = "";
  medicineSelect.value = "";
  symptomSelect.value = "";
  updateCareSummary();
  currentSubmissionId = null;
}

function updateCareSummary() {
  const care = symptomCareMap[symptomSelect.value];
  const medicine = care && medicineData[care.medicine];

  if (!care) {
    medicineSelect.value = "";
    careSummaryText.textContent = "-";
    careSummary.hidden = true;
    return;
  }

  if (care.referral) {
    medicineSelect.value = "";
    careSummaryText.textContent = care.message;
    careSummary.hidden = false;
    return;
  }

  if (!medicine) {
    medicineSelect.value = "";
    careSummaryText.textContent = "-";
    careSummary.hidden = true;
    return;
  }

  medicineSelect.value = care.medicine;
  careSummaryText.textContent = care.label + " → " + medicine.name;
  careSummary.hidden = false;
}

async function registerMember(name, studentId, program, level, phone) {
  const cleanName = String(name || "").trim();
  const cleanStudentId = normalizeStudentId(studentId);
  const cleanProgram = String(program || "").trim();
  const cleanLevel = String(level || "").trim();
  const cleanPhone = String(phone || "").replace(/\D/g, "");

  if (!cleanName) {
    throw new Error("กรุณากรอกชื่อ-นามสกุล");
  }

  if (!isValidStudentId(cleanStudentId)) {
    throw new Error("รหัสนักศึกษาต้องเป็นตัวเลข 5-15 หลัก");
  }
  if (!cleanProgram || !cleanLevel || !/^\d{9,15}$/.test(cleanPhone)) {
    throw new Error("กรุณากรอกสาขาวิชา ระดับชั้น และเบอร์โทรให้ถูกต้อง");
  }

  if (!/^ปว[ชส]\.[1-3]$/.test(cleanLevel)) {
    throw new Error("กรุณาเลือกระดับชั้นจากรายการ");
  }

  const result = await postAction("register", {
    name: cleanName,
    studentId: cleanStudentId,
    program: cleanProgram,
    level: cleanLevel,
    phone: cleanPhone
  });

  const member = result.member || {
    name: cleanName,
    studentId: cleanStudentId
  };

  saveMemberSession(member);
  showRequestView(member);
}

async function loginMember(studentId, phone) {
  const cleanStudentId = normalizeStudentId(studentId);

  const cleanPhone = String(phone || "").replace(/\D/g, "");

  if (!isValidStudentId(cleanStudentId)) {
    throw new Error("รหัสนักศึกษาต้องเป็นตัวเลข 5-15 หลัก");
  }

  if (!/^\d{9,15}$/.test(cleanPhone)) throw new Error("กรุณากรอกเบอร์โทรให้ถูกต้อง");
  const result = await postAction("member", { studentId: cleanStudentId, phone: cleanPhone });
  const member = result.member;

  if (!member || member.studentId !== cleanStudentId) {
    throw new Error("รหัสนักศึกษาหรือเบอร์โทรไม่ตรงกับข้อมูลสมาชิก");
  }

  saveMemberSession(member);
  showRequestView(member);
}

async function restoreMemberSession() {
  const stored = localStorage.getItem(MEMBER_STORAGE_KEY);

  if (!stored) {
    showRegistrationView();
    return;
  }

  try {
    const member = JSON.parse(stored);

    const sessionPhone = String(member && member.phone || "").replace(/\D/g, "");

    if (!member || !isValidStudentId(member.studentId) || !/^\d{9,15}$/.test(sessionPhone)) {
      throw new Error("ข้อมูลสมาชิกไม่ถูกต้อง");
    }

    const result = await postAction("member", {
      studentId: member.studentId,
      phone: sessionPhone
    });
    const verifiedMember = result.member;

    if (!verifiedMember || !verifiedMember.name || !isValidStudentId(verifiedMember.studentId)) {
      throw new Error("ไม่พบข้อมูลสมาชิก");
    }

    saveMemberSession(verifiedMember);
    showRequestView(verifiedMember);
  } catch (error) {
    showRegistrationView();

    if (error instanceof TypeError || /fetch|network/i.test(String(error.message || ""))) {
      showRegistrationMessage("ไม่สามารถเชื่อมต่อระบบได้ โปรดลองใหม่เมื่อมีอินเทอร์เน็ต", "warning");
      return;
    }

    localStorage.removeItem(MEMBER_STORAGE_KEY);
    showRegistrationMessage("กรุณาสมัครใช้งานก่อนลงทะเบียนรับยา", "warning");
  }
}

function signOut() {
  localStorage.removeItem(MEMBER_STORAGE_KEY);
  registrationForm.reset();
  showRegistrationMessage("", "");
  showRegistrationView();
}

registrationForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  if (registrationSubmitButton.disabled) return;

  registrationSubmitButton.disabled = true;
  registrationSubmitButton.textContent = "กำลังสมัคร...";
  showRegistrationMessage("กำลังบันทึกข้อมูลสมาชิก...", "warning");

  try {
    await registerMember(registrationName.value, registrationStudentId.value, registrationProgram.value, registrationLevel.value, registrationPhone.value);
    showRegistrationMessage("", "");
  } catch (error) {
    showRegistrationMessage(error.message || "ไม่สามารถสมัครได้", "error");
  } finally {
    registrationSubmitButton.disabled = false;
    registrationSubmitButton.textContent = "สมัครสมาชิก";
  }
});

showRegistrationButton.addEventListener("click", function () {
  registrationForm.reset();
  showRegistrationMessage("", "");
  setAuthMode("signup");
});

backToLoginButton.addEventListener("click", function () {
  registrationForm.reset();
  showRegistrationMessage("", "");
  setAuthMode("login");
});

signOutButton.addEventListener("click", signOut);

medicineForm.addEventListener("input", function () {
  currentSubmissionId = null;
});

medicineForm.addEventListener("change", function () {
  currentSubmissionId = null;
});

symptomSelect.addEventListener("change", updateCareSummary);

loginButton.addEventListener("click", async function () {
  if (loginButton.disabled) return;

  loginButton.disabled = true;
  showRegistrationMessage("กำลังตรวจสอบข้อมูลสมาชิก...", "warning");

  try {
    await loginMember(registrationStudentId.value, registrationPhone.value);
    showRegistrationMessage("", "");
  } catch (error) {
    if (error.message === "รหัสนักศึกษานี้ยังไม่ได้สมัครใช้งาน") {
      showSignupForNewMember();
    } else {
      showRegistrationMessage(error.message || "ไม่สามารถเข้าสู่ระบบได้", "error");
    }
  } finally {
    loginButton.disabled = false;
  }
});

// ==========================================
// ส่งคำขอและรับผลอัตโนมัติ
// ==========================================

medicineForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  if (submitButton.disabled) return;

  const studentId =
    document.getElementById("studentId").value.trim();

  const studentName =
    document.getElementById("name").value.trim();

  const studentRoom =
    document.getElementById("room").value.trim();

  const selectedSymptom = document.getElementById("symptom").value;
  const care = symptomCareMap[selectedSymptom];
  const selectedMedicine = care && care.medicine;
  const symptom = care && care.label;

  if (care && care.referral) {
    showMessage(care.message, "warning");
    return;
  }

  if (!studentId || !studentName || !studentRoom ||
      !selectedMedicine || !symptom) {
    showMessage("กรุณากรอกข้อมูลให้ครบทุกช่อง", "error");
    return;
  }

  if (!isValidStudentId(studentId)) {
    showMessage("รหัสนักศึกษาต้องเป็นตัวเลข 5-15 หลัก", "error");
    return;
  }

  if (!medicineData[selectedMedicine]) {
    showMessage("ไม่พบชนิดยาที่เลือก", "error");
    return;
  }

  if (!currentSubmissionId) {
    currentSubmissionId =
      window.crypto && crypto.randomUUID
        ? crypto.randomUUID()
        : "MB-" + Date.now() + "-" +
          Math.random().toString(36).slice(2);
  }

  submitButton.disabled = true;
  submitButton.textContent = "กำลังตรวจสอบ...";
  showMessage(
    "ระบบกำลังตรวจสอบเงื่อนไข กรุณารอสักครู่...",
    "warning"
  );

  try {
    const result = await postAction("saveRequest", {
      submissionId: currentSubmissionId,
      studentId: studentId,
      name: studentName,
      room: studentRoom,
      medicine: selectedMedicine,
      symptom: symptom
    });

    currentSubmissionId = null;

    showSuccessPage({
      requestId: result.requestId,
      remaining: result.remaining,
      unlimitedQuota: result.unlimitedQuota,
      message: result.message,
      deviceTest: result.deviceTest,
      name: studentName,
      room: studentRoom,
      symptom: symptom
    });

  } catch (error) {
    console.error("MEDICINE BOX ERROR:", error);

    showMessage(
      error.message || "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง",
      "error"
    );

  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "ส่งคำขอให้เจ้าหน้าที่ตรวจสอบ";
  }
});

// ==========================================
// แสดงหน้าสำเร็จ
// ==========================================

function showSuccessPage(data) {
  document.getElementById("successRequestId").textContent =
    data.requestId || "-";

  document.getElementById("successName").textContent =
    data.name;

  document.getElementById("successRoom").textContent =
    data.room;

  document.getElementById("successSymptom").textContent =
    data.symptom;

  const remainingElement =
    document.getElementById("successRemaining");

  const deviceTestMessage = data.deviceTest === "queued"
    ? "กำลังทดสอบการเชื่อมต่อกับตู้ยา (ไฟ LED เท่านั้น)"
    : data.deviceTest === "already_queued"
      ? "มีการทดสอบการเชื่อมต่อกับตู้ยาสำหรับรายการนี้แล้ว"
      : "";

  document.getElementById("successServerMessage").textContent = [
    data.message || "ไม่พบสถานะจากระบบ",
    deviceTestMessage
  ].filter(Boolean).join(" ");

  if (remainingElement) {
    remainingElement.textContent =
      data.unlimitedQuota ? "ไม่จำกัด (บัญชีทดสอบ)" : data.remaining + " รายการ";
  }

  formView.hidden = true;
  successView.hidden = false;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

// ==========================================
// กลับหน้าหลัก
// ==========================================

backButton.addEventListener("click", function () {
  const member = getSavedMember();
  clearRequestFields();

  message.textContent = "";
  message.className = "message";

  if (member) {
    showRequestView(member);
  } else {
    showRegistrationView();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});

// ==========================================
// แสดงข้อความ
// ==========================================

function showMessage(text, type) {
  message.textContent = text;
  message.className = "message " + type;
}

window.MedicineBox = {
  registerMember,
  loginMember,
  restoreMemberSession,
  signOut,
  showSignupForNewMember
};

restoreMemberSession();
