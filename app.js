const STORAGE_KEY = "amy-deluxe-questionnaire-v1";
const TOTAL_STEPS = 10;
const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const intro = document.querySelector("#intro");
const questionnaire = document.querySelector("#questionnaire");
const success = document.querySelector("#success");
const form = document.querySelector("#storeForm");
const steps = [...document.querySelectorAll(".form-step")];
const stepNav = document.querySelector("#stepNav");
const startButton = document.querySelector("#startButton");
const backButton = document.querySelector("#backButton");
const nextButton = document.querySelector("#nextButton");
const submitButton = document.querySelector("#submitButton");
const saveStatus = document.querySelector("#saveStatus");

let currentStep = 1;
let highestVisitedStep = 1;
let saveTimer;

function buildHours() {
  const hoursContainer = document.querySelector("#businessHours");

  DAYS.forEach((day, index) => {
    const isOpen = index < 5;
    const row = document.createElement("div");
    row.className = `hours-row${isOpen ? "" : " closed"}`;
    row.innerHTML = `
      <span>${day}</span>
      <label>
        <input type="checkbox" name="hours_${day}_open" ${
          isOpen ? "checked" : ""
        }>
        Open
      </label>
      <input
        type="time"
        name="hours_${day}_start"
        value="${isOpen ? "09:00" : ""}"
        aria-label="${day} opening time"
        ${isOpen ? "" : "disabled"}
      >
      <i>to</i>
      <input
        type="time"
        name="hours_${day}_end"
        value="${isOpen ? "17:00" : ""}"
        aria-label="${day} closing time"
        ${isOpen ? "" : "disabled"}
      >
    `;

    const openControl = row.querySelector('input[type="checkbox"]');
    const timeInputs = row.querySelectorAll('input[type="time"]');
    openControl.addEventListener("change", () => {
      row.classList.toggle("closed", !openControl.checked);
      timeInputs.forEach((input, timeIndex) => {
        input.disabled = !openControl.checked;
        if (openControl.checked && !input.value) {
          input.value = timeIndex === 0 ? "09:00" : "17:00";
        }
      });
      scheduleSave();
    });

    hoursContainer.appendChild(row);
  });
}

function buildStepNav() {
  steps.forEach((step, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.stepTarget = String(index + 1);
    button.innerHTML = `
      <span>${index + 1}</span>
      <span>${step.dataset.title}</span>
    `;
    button.addEventListener("click", () => {
      const target = index + 1;
      if (target <= highestVisitedStep) showStep(target);
    });
    stepNav.appendChild(button);
  });
}

function showStep(stepNumber, options = {}) {
  currentStep = Math.max(1, Math.min(TOTAL_STEPS, stepNumber));
  highestVisitedStep = Math.max(highestVisitedStep, currentStep);

  steps.forEach((step) => {
    step.classList.toggle("active", Number(step.dataset.step) === currentStep);
  });

  [...stepNav.children].forEach((button, index) => {
    const number = index + 1;
    button.classList.toggle("active", number === currentStep);
    button.classList.toggle("complete", number < currentStep);
    button.disabled = number > highestVisitedStep;
  });

  const percent = Math.round((currentStep / TOTAL_STEPS) * 100);
  document.querySelector("#progressLabel").textContent =
    `Step ${currentStep} of ${TOTAL_STEPS}`;
  document.querySelector("#progressPercent").textContent = `${percent}%`;
  document.querySelector("#progressFill").style.width = `${percent}%`;
  document
    .querySelector(".progress-track")
    .setAttribute("aria-valuenow", String(currentStep));

  backButton.classList.toggle("hidden", currentStep === 1);
  nextButton.classList.toggle("hidden", currentStep === TOTAL_STEPS);
  submitButton.classList.toggle("hidden", currentStep !== TOTAL_STEPS);

  clearValidationMessage();
  updateConditionals();
  scheduleSave();

  if (!options.keepPosition) {
    questionnaire.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function validateCurrentStep() {
  clearValidationMessage();
  const currentPanel = steps[currentStep - 1];
  const controls = [
    ...currentPanel.querySelectorAll("input, textarea, select"),
  ].filter(
    (control) =>
      !control.disabled &&
      !control.closest(".hidden") &&
      control.offsetParent !== null,
  );
  const invalidControl = controls.find((control) => !control.checkValidity());

  if (invalidControl) {
    const message = document.createElement("p");
    message.className = "invalid-message";
    message.textContent = "Please complete the required fields before continuing.";
    document.querySelector(".form-actions").before(message);
    invalidControl.reportValidity();
    invalidControl.focus({ preventScroll: true });
    invalidControl.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }

  return true;
}

function clearValidationMessage() {
  document.querySelector(".invalid-message")?.remove();
  document.querySelector(".submit-message")?.remove();
}

function getValue(name) {
  return form.elements[name]?.value || "";
}

function setDisabledOption(selector, disabled, reason) {
  const card = document.querySelector(selector);
  if (!card) return;

  const input = card.querySelector("input");
  input.disabled = disabled;
  if (disabled && input.checked) input.checked = false;
  const reasonElement = card.querySelector(".disabled-reason");
  if (reasonElement) reasonElement.textContent = disabled ? reason : "";
}

function toggleConditional(selector, visible) {
  const element = document.querySelector(selector);
  element.classList.toggle("hidden", !visible);
  element.querySelectorAll("input, textarea, select").forEach((control) => {
    if (!visible) control.disabled = true;
    else if (!control.dataset.permanentlyDisabled) control.disabled = false;
  });
}

function updateConditionals() {
  const isB2BOnly = getValue("businessModel") === "B2B";
  setDisabledOption(
    '[data-option="public-access"]',
    isB2BOnly,
    "Unavailable for a wholesale-only store. Please select Private or Hybrid.",
  );
  setDisabledOption(
    '[data-option="no-application"]',
    isB2BOnly,
    "A wholesale application is required for a B2B-only store.",
  );

  const taxExempt = getValue("taxHandling") === "Tax-exempt wholesale";
  setDisabledOption(
    '[data-option="no-certificate-tracking"]',
    isB2BOnly || taxExempt,
    "Certificate tracking is required for this wholesale workflow.",
  );

  toggleConditional("#tierCountGroup", getValue("pricingTiers") === "Yes");

  const paymentMethods = checkedValues("paymentMethods");
  toggleConditional(
    "#storeCreditGroup",
    paymentMethods.includes("Store credit"),
  );
  toggleConditional(
    "#creditTermsGroup",
    paymentMethods.includes("Customer credit terms"),
  );

  const pickupValue = getValue("pickup");
  const hasPickup = Boolean(pickupValue && pickupValue !== "No");
  toggleConditional("#pickupDetails", hasPickup);
  toggleConditional(
    "#customPickupDetails",
    hasPickup && getValue("pickupSameAsMain") === "No",
  );

  toggleConditional(
    "#accountingPlatformGroup",
    getValue("invoicePlatform") === "Accounting platform",
  );
}

function checkedValues(name) {
  return [...form.querySelectorAll(`[name="${name}"]:checked`)].map(
    (input) => input.value,
  );
}

function collectData() {
  const data = {};
  const formData = new FormData(form);

  for (const [key, value] of formData.entries()) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      data[key] = Array.isArray(data[key])
        ? [...data[key], value]
        : [data[key], value];
    } else {
      data[key] = value;
    }
  }

  return data;
}

function saveProgress() {
  const payload = {
    data: collectData(),
    currentStep,
    highestVisitedStep,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  saveStatus.classList.add("visible");
  window.clearTimeout(saveStatus.hideTimer);
  saveStatus.hideTimer = window.setTimeout(
    () => saveStatus.classList.remove("visible"),
    1800,
  );
}

function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveProgress, 250);
}

function restoreProgress() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;

  try {
    const saved = JSON.parse(raw);
    form
      .querySelectorAll('input[type="radio"], input[type="checkbox"]')
      .forEach((control) => {
        control.checked = false;
      });

    Object.entries(saved.data || {}).forEach(([name, savedValue]) => {
      const controls = [...form.querySelectorAll(`[name="${CSS.escape(name)}"]`)];
      if (!controls.length) return;
      const values = Array.isArray(savedValue) ? savedValue : [savedValue];

      controls.forEach((control) => {
        if (control.type === "radio" || control.type === "checkbox") {
          control.checked = values.includes(control.value);
        } else {
          control.value = savedValue;
        }
      });
    });

    document.querySelectorAll(".hours-row").forEach((row) => {
      const openControl = row.querySelector('input[type="checkbox"]');
      const timeInputs = row.querySelectorAll('input[type="time"]');
      row.classList.toggle("closed", !openControl.checked);
      timeInputs.forEach((input) => {
        input.disabled = !openControl.checked;
      });
    });

    currentStep = Number(saved.currentStep) || 1;
    highestVisitedStep = Number(saved.highestVisitedStep) || currentStep;
    startButton.firstChild.textContent = "Continue questionnaire ";
    updateConditionals();
    return true;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }
}

function startQuestionnaire() {
  intro.classList.add("hidden");
  success.classList.add("hidden");
  questionnaire.classList.remove("hidden");
  showStep(currentStep, { keepPosition: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

startButton.addEventListener("click", startQuestionnaire);

nextButton.addEventListener("click", () => {
  if (!validateCurrentStep()) return;
  showStep(currentStep + 1);
});

backButton.addEventListener("click", () => showStep(currentStep - 1));

form.addEventListener("input", () => {
  updateConditionals();
  scheduleSave();
});

form.addEventListener("change", (event) => {
  if (event.target.name === "carriers") {
    const noneOption = form.querySelector(
      '[name="carriers"][value="None yet"]',
    );
    const otherCarriers = [
      ...form.querySelectorAll('[name="carriers"]:not([value="None yet"])'),
    ];

    if (event.target === noneOption && noneOption.checked) {
      otherCarriers.forEach((control) => {
        control.checked = false;
      });
    } else if (event.target.checked) {
      noneOption.checked = false;
    }
  }

  updateConditionals();
  scheduleSave();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateCurrentStep()) return;

  saveProgress();
  clearValidationMessage();
  submitButton.disabled = true;
  const originalButtonContent = submitButton.innerHTML;
  submitButton.textContent = "Sending…";

  try {
    const response = await fetch("submit.php", {
      method: "POST",
      body: new FormData(form),
      headers: {
        Accept: "application/json",
      },
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      throw new Error(result.message || "The questionnaire could not be sent.");
    }

    questionnaire.classList.add("hidden");
    success.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    const message = document.createElement("p");
    message.className = "submit-message";
    message.textContent =
      error.message ||
      "We could not send your answers. Please try again in a moment.";
    document.querySelector(".form-actions").after(message);
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalButtonContent;
  }
});

document.querySelector("#editButton").addEventListener("click", () => {
  success.classList.add("hidden");
  questionnaire.classList.remove("hidden");
  showStep(TOTAL_STEPS, { keepPosition: true });
});

buildHours();
buildStepNav();
restoreProgress();
showStep(currentStep, { keepPosition: true });
