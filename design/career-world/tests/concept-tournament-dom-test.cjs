const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { webcrypto } = require("crypto");
const { fileURLToPath, pathToFileURL } = require("url");

const toolRoot = path.resolve(__dirname, "..");
const htmlPath = path.join(toolRoot, "concept-tournament.html");
const appPath = path.join(toolRoot, "concept-tournament.js");
const html = fs.readFileSync(htmlPath, "utf8");
const catalogPath = path.join(toolRoot, "concept-tournaments", "tournament-catalog.js");
const catalogSandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(catalogPath, "utf8"), catalogSandbox, { filename: catalogPath });
const catalogDefinition = catalogSandbox.window.__CONCEPT_TOURNAMENT_CATALOG__;
const source = fs.readFileSync(appPath, "utf8");

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...items) { items.forEach(item => this.values.add(item)); }
  remove(...items) { items.forEach(item => this.values.delete(item)); }
  toggle(item, force) {
    if (force === true) this.values.add(item);
    else if (force === false) this.values.delete(item);
    else if (this.values.has(item)) this.values.delete(item);
    else this.values.add(item);
    return this.values.has(item);
  }
  contains(item) { return this.values.has(item); }
}

class FakeElement {
  constructor(tag = "div", id = "") {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.hidden = false;
    this.disabled = false;
    this.value = "";
    this.children = [];
    this._textContent = "";
    this.innerHTML = "";
    this.className = "";
    this.classList = new FakeClassList();
    this.style = {};
    this.listeners = new Map();
    this.attributes = {};
    this.files = [];
    this.isContentEditable = false;
  }
  get textContent() { return this._textContent; }
  set textContent(value) {
    this._textContent = String(value ?? "");
    this.children = [];
  }
  get options() {
    return this.children.flatMap(child => {
      if (!child) return [];
      if (child.tagName === "OPTION") return [child];
      return Array.isArray(child.options) ? child.options : [];
    });
  }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }
  dispatchEvent(event) {
    event.target = event.target || this;
    for (const fn of this.listeners.get(event.type) || []) fn.call(this, event);
    return true;
  }
  click() {
    if (this.disabled) return;
    this.dispatchEvent({ type: "click", target: this, preventDefault() {}, stopPropagation() {} });
  }
  append(...items) {
    for (const item of items) {
      if (item && item.isFragment) this.children.push(...item.children);
      else this.children.push(item);
    }
  }
  appendChild(item) { this.append(item); return item; }
  replaceChildren(...items) { this.children = []; this.append(...items); }
  remove() {}
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] || null; }
  closest(selector) { return selector === "button" && this.tagName === "BUTTON" ? this : null; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000 }; }
  setPointerCapture() {}
  releasePointerCapture() {}
  scrollIntoView() {}
}

class FakeInputElement extends FakeElement {
  constructor(id = "") { super("input", id); }
}

class FakeTextAreaElement extends FakeElement {
  constructor(id = "") { super("textarea", id); }
}

class FakeFragment extends FakeElement {
  constructor() { super("fragment"); this.isFragment = true; }
}

const elements = new Map();
for (const match of html.matchAll(/<([a-z0-9-]+)[^>]*\bid="([^"]+)"/gi)) {
  const tag = match[1].toLowerCase();
  const id = match[2];
  const element = tag === "input"
    ? new FakeInputElement(id)
    : tag === "textarea"
      ? new FakeTextAreaElement(id)
      : new FakeElement(tag, id);
  if (/\bhidden\b/i.test(match[0])) element.hidden = true;
  elements.set(id, element);
}

const documentListeners = new Map();
const document = {
  title: "",
  body: new FakeElement("body"),
  head: new FakeElement("head"),
  querySelector(selector) {
    return selector.startsWith("#") ? elements.get(selector.slice(1)) || null : null;
  },
  createElement(tag) {
    if (tag === "input") return new FakeInputElement();
    if (tag === "textarea") return new FakeTextAreaElement();
    return new FakeElement(tag);
  },
  createDocumentFragment() { return new FakeFragment(); },
  addEventListener(type, fn) {
    if (!documentListeners.has(type)) documentListeners.set(type, []);
    documentListeners.get(type).push(fn);
  }
};

let blobCounter = 0;
let exportedBlob = null;
class FakeURL extends URL {}
FakeURL.createObjectURL = function createObjectURL(value) {
    if (value instanceof Blob) exportedBlob = value;
    blobCounter += 1;
    return `blob:test-${blobCounter}`;
};
FakeURL.revokeObjectURL = function revokeObjectURL() {};

const windowListeners = new Map();
const localStorageValues = new Map([["career-world-concept-tournament-batch-v1", JSON.stringify({
  schemaVersion: 1,
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:10:00.000Z",
  records: {
    "city/ninjaone@v1": {
      catalogId: "city/ninjaone@v1",
      name: "NinjaOne",
      category: "city",
      folder: "city-ninjaone-r1",
      manifestPath: "concept-tournaments/city-ninjaone-r1/tournament-set.js",
      assets: [],
      attempts: [{ attemptId: "stale-r1-attempt" }],
      lock: null,
      disposition: "reviewed",
      notes: "Old R1 telemetry must not mark the R2 set reviewed.",
      updatedAt: "2026-07-18T00:10:00.000Z"
    },
    "skill/safe-writes@v1": {
      catalogId: "skill/safe-writes@v1",
      name: "Safe writes",
      category: "skill",
      folder: "skill-safe-writes-r1",
      manifestPath: "concept-tournaments/skill-safe-writes-r1/tournament-set.js",
      assets: [],
      attempts: [
        { sessionId: "superseded-session" },
        { sessionId: "latest-session" }
      ],
      lock: null,
      disposition: "reviewed",
      notes: "Excluded fixture used to verify refresh-time attempt normalization.",
      updatedAt: "2026-07-18T00:10:00.000Z"
    }
  }
})]]);
const sandbox = {
  console,
  document,
  crypto: webcrypto,
  URL: FakeURL,
  Blob,
  Date,
  Math,
  JSON,
  Map,
  Set,
  Array,
  Object,
  String,
  Number,
  Boolean,
  Promise,
  Uint32Array,
  URLSearchParams,
  HTMLInputElement: FakeInputElement,
  HTMLTextAreaElement: FakeTextAreaElement,
  __CONCEPT_TOURNAMENT_CATALOG__: catalogDefinition,
  localStorage: {
    getItem(key) { return localStorageValues.has(key) ? localStorageValues.get(key) : null; },
    setItem(key, value) { localStorageValues.set(key, String(value)); },
    removeItem(key) { localStorageValues.delete(key); }
  },
  setTimeout(fn) { fn(); return 1; },
  clearTimeout() {},
  addEventListener(type, fn) {
    if (!windowListeners.has(type)) windowListeners.set(type, []);
    windowListeners.get(type).push(fn);
  },
  location: {
    href: pathToFileURL(htmlPath).href,
    protocol: "file:",
    origin: "null",
    search: ""
  },
  history: {
    replaceState(_state, _title, href) {
      const nextUrl = new URL(String(href));
      sandbox.location.href = nextUrl.href;
      sandbox.location.search = nextUrl.search;
    }
  },
  scrollTo() {}
};
sandbox.window = sandbox;

const context = vm.createContext(sandbox);
const appendToHead = document.head.append.bind(document.head);
document.head.append = function append(item) {
  appendToHead(item);
  if (item?.tagName !== "SCRIPT") return;
  try {
    const manifestSource = fs.readFileSync(fileURLToPath(item.src), "utf8");
    new vm.Script(manifestSource, { filename: item.src }).runInContext(context);
    if (typeof item.onload === "function") item.onload();
  } catch (error) {
    if (typeof item.onerror === "function") item.onerror(error);
    else throw error;
  }
};
new vm.Script(source, { filename: "concept-tournament.html" }).runInContext(context);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function conceptCardByName(name) {
  return elements.get("concept-contact-sheet").children.find(card => card.getAttribute("aria-label") === `Inspect ${name}`) || null;
}

async function main() {
  assert(html.includes('href="concept-tournament.css"'), "HTML entry point did not load the dedicated stylesheet");
  assert(html.includes('src="concept-tournament.js"'), "HTML entry point did not load the application runtime");
  assert(!html.includes("<style>"), "inline styles returned to the HTML entry point");
  assert(!html.includes("<script>"), "inline application logic returned to the HTML entry point");
  const api = sandbox.__conceptTournament;
  assert(api.phase === "setup", "page did not initialize in setup");
  assert(api.catalogCount === 62, "local catalog did not retain all 62 documented tournaments");
  assert(api.activeCatalogCount === 60 && api.excludedCatalogCount === 2, "active/excluded catalog counts are wrong");
  assert(api.reviewCatalogCount === 53 && api.variantKitCatalogCount === 7, "review/variant-kit catalog counts are wrong");
  assert(elements.get("tournament-select").options.length === 54, "selector did not render all review catalog entries");
  assert(elements.get("batch-progress").textContent === "0/53 reviewed | 0 approved | 0 redo | 0 removed | 7 kits | 53 pending", "initial batch progress is wrong");
  assert(!elements.has("dropzone") && !elements.has("choose-files") && !elements.has("choose-folder"), "manual image and folder loaders are still exposed");
  assert(elements.get("review-ready-name").textContent === "Select a tournament above", "project-only setup did not initialize its review prompt");
  const ninjaR2Option = elements.get("tournament-select").options.find(option => option.value.includes("city-ninjaone-r2"));
  assert(ninjaR2Option && ninjaR2Option.textContent.startsWith("[PENDING]"), "stale NinjaOne R1 telemetry marked the R2 set reviewed");
  assert(!elements.get("tournament-select").options.some(option => option.value.includes("city-ninjaone-r1")), "selector still routed NinjaOne to R1");
  assert(elements.get("start-button").disabled === true, "start should be disabled without images");
  api.loadSetManifest("concept-tournaments/skill-safe-writes-r1/tournament-set.js");
  assert(api.phase === "setup" && api.assetCount === 0, "excluded Safe Writes route still loaded a tournament");
  assert(elements.get("load-error").textContent.includes("excluded"), "excluded route did not explain why it was blocked");
  api.loadSetManifest("concept-tournaments/ambient-rock-cluster-r1/tournament-set.js");
  assert(api.phase === "setup" && api.assetCount === 0, "Rock Cluster variant-kit route still loaded a tournament");
  assert(elements.get("load-error").textContent.includes("production variant kit"), "variant-kit route did not explain why review was skipped");

  const files = Array.from({ length: 5 }, (_, index) => ({
    name: `option-${index + 1}.png`,
    type: "image/png",
    size: 100 + index,
    lastModified: 1700000000000 + index,
    webkitRelativePath: ""
  }));
  const fileInput = elements.get("file-input");
  fileInput.files = files;
  fileInput.dispatchEvent({ type: "change", target: fileInput });
  assert(api.assetCount === 5, "five-image set did not load");
  assert(elements.get("start-button").disabled === false, "start did not enable");
  assert(elements.get("asset-list").children.length === 5, "asset editor did not render all images");

  elements.get("start-button").click();
  assert(api.phase === "play" && api.runCount === 1, "run 1 did not start");
  assert(/^Concept /.test(elements.get("left-name").textContent), "names are not blind by default");
  elements.get("toggle-names").click();
  assert(
    elements.get("left-name").textContent && !/^Concept /.test(elements.get("left-name").textContent),
    "name reveal did not work"
  );
  elements.get("toggle-names").click();

  elements.get("candidate-left").click();
  assert(elements.get("progress-label").textContent.startsWith("1 / 4"), "first choice was not counted");
  elements.get("undo-button").click();
  assert(elements.get("progress-label").textContent.startsWith("0 / 4"), "undo did not restore progress");

  let guard = 0;
  while (api.phase === "play" && guard++ < 20) elements.get("candidate-left").click();
  assert(api.phase === "between", "odd-sized run 1 did not finish");

  elements.get("between-undo").click();
  assert(api.phase === "play", "between-screen undo did not reopen the final");
  elements.get("candidate-right").click();
  assert(api.phase === "between", "run 1 did not re-finish after undo");
  elements.get("second-run-button").click();
  assert(api.phase === "play" && api.runCount === 2, "run 2 did not start");

  guard = 0;
  while (api.phase === "play" && guard++ < 20) {
    elements.get(guard % 2 ? "candidate-left" : "candidate-right").click();
  }
  assert(api.phase === "calibration", "run 2 did not start calibration");

  guard = 0;
  while (api.phase === "calibration" && guard++ < 20) {
    elements.get(guard % 2 ? "candidate-left" : "candidate-right").click();
  }
  assert(api.phase === "results", "calibration did not finish");

  elements.get("results-undo").click();
  assert(api.phase === "calibration", "results undo did not reopen calibration");
  elements.get("candidate-left").click();
  assert(api.phase === "results", "results did not regenerate after undo");

  elements.get("export-button").click();
  assert(exportedBlob, "JSON export did not create a file");
  const result = JSON.parse(await exportedBlob.text());
  assert(result.assets.length === 5, "export lost assets");
  assert(result.runs.length === 2, "export lost a run");
  assert(result.schemaVersion === 3, "export schema was not upgraded");
  assert(result.telemetry && result.telemetry.schemaVersion === 1, "telemetry payload is missing");
  assert(result.telemetry.summary.recordedDecisionCount === 14, "valid telemetry decision count is wrong");
  assert(result.telemetry.summary.totalChoiceEventCount === 17, "raw telemetry did not retain undone choices");
  assert(result.telemetry.summary.undoneChoiceCount === 3, "undo telemetry count is wrong");
  assert(result.telemetry.summary.nameRevealToggleCount === 2, "name reveal telemetry count is wrong");
  assert(
    result.telemetry.events.filter(event => event.type === "choice" && !event.undone).every(event => Number.isFinite(event.decisionMs)),
    "choice latency telemetry is missing"
  );
  assert(result.runs.every(run => run.champion && run.rounds.length === 3), "exported brackets are incomplete");
  assert(result.calibration && result.calibration.comparisons.length === 6, "top-four calibration was not exported");
  assert(
    result.runs.every(run => run.rounds[0].matches.filter(match => match.automaticBye).length === 3),
    "opening-round byes were not recorded correctly"
  );
  assert(
    result.runs.every(run => run.rounds.slice(1).every(round => round.matches.every(match => !match.automaticBye))),
    "a bye leaked past the opening round"
  );
  assert(
    result.runs[0].seedOrder.map(item => item.id).join("|") !== result.runs[1].seedOrder.map(item => item.id).join("|"),
    "seed sequences did not change"
  );
  assert(
    result.runs[0].openingPairSignature !== result.runs[1].openingPairSignature,
    "opening pairings did not change"
  );
  assert(
    result.telemetry.summary.pairResults.filter(pair => pair.comparisonCount > 1).every(pair => (
      pair.decisions.every((decision, index) => index === 0 || decision.leftId !== pair.decisions[index - 1].leftId)
    )),
    "a repeated pair was not mirrored"
  );

  elements.get("new-set-button").click();
  assert(api.phase === "setup" && api.assetCount === 0, "new-set reset failed");

  const manifestRoute = "concept-tournaments/ace-hardware-city-r2/tournament-set.js";
  const tournamentSelect = elements.get("tournament-select");
  tournamentSelect.value = manifestRoute;
  tournamentSelect.dispatchEvent({ type: "change", target: tournamentSelect });
  assert(api.assetCount === 10, "ACE manifest did not load ten concepts");
  assert(elements.get("set-name").value === "ACE Hardware City · Round 2", "manifest set name did not load");
  assert(elements.get("review-ready-name").textContent === "ACE Hardware City · Round 2", "selected asset was not shown in the simplified setup");
  assert(elements.get("start-button").textContent === "Start review →", "simplified setup did not expose the review action");
  assert(elements.get("loaded-source").hidden === false, "manifest source route was not shown");
  const setupTelemetrySessionId = api.telemetrySessionId;
  elements.get("start-button").click();
  assert(api.telemetrySessionId !== setupTelemetrySessionId, "Start review reused the setup telemetry session");
  assert(api.telemetryDecisionCount === 0, "Start review carried choice decisions into the new session");
  assert(elements.get("match-title").textContent === "ACE Hardware City · Round 2", "matchup header did not show the current asset");
  guard = 0;
  while (api.phase === "play" && guard++ < 20) elements.get("candidate-left").click();
  elements.get("second-run-button").click();
  guard = 0;
  while (api.phase === "play" && guard++ < 20) elements.get("candidate-right").click();
  guard = 0;
  while (api.phase === "calibration" && guard++ < 20) elements.get("candidate-left").click();
  assert(api.phase === "results", "manifest-backed tournament did not finish");
  assert(elements.get("concept-contact-sheet").children.length === 10, "final review board did not show all concepts");
  assert(elements.get("annotation-image").src, "annotation workspace did not load the selected concept");
  assert(api.batchReviewedCount === 1, "completed catalog tournament was not saved locally");
  assert(elements.get("batch-progress").textContent === "1/53 reviewed | 0 approved | 0 redo | 0 removed | 7 kits | 52 pending", "reviewed progress is wrong");
  const firstCompletedSessionId = api.telemetrySessionId;
  elements.get("rerun-button").click();
  const rerunSessionId = api.telemetrySessionId;
  assert(rerunSessionId !== firstCompletedSessionId, "same-set rerun reused the completed telemetry session");
  assert(api.phase === "play" && api.runCount === 1, "same-set rerun did not start a new first run");
  assert(api.telemetryDecisionCount === 0, "same-set rerun carried choice decisions into the new session");
  guard = 0;
  while (api.phase === "play" && guard++ < 20) elements.get("candidate-right").click();
  elements.get("second-run-button").click();
  guard = 0;
  while (api.phase === "play" && guard++ < 20) elements.get("candidate-left").click();
  guard = 0;
  while (api.phase === "calibration" && guard++ < 20) elements.get("candidate-right").click();
  assert(api.phase === "results", "fresh same-set telemetry session did not finish");
  assert(api.buildResultPayload().telemetry.sessionId === rerunSessionId, "result payload did not use the fresh rerun session");
  exportedBlob = null;
  elements.get("export-button").click();
  const manifestResult = JSON.parse(await exportedBlob.text());
  assert(manifestResult.source.kind === "url-manifest", "manifest source was not exported");
  assert(manifestResult.assets.every(asset => asset.metadata.tags.length > 0), "manifest analysis tags were not exported");
  assert(manifestResult.assets.every(asset => asset.metadata.role), "controlled-test roles were not exported");
  assert(manifestResult.telemetry.summary.tagSignals.length > 0, "tag preference signals were not generated");
  assert(elements.get("lock-candidate").options.length === 10, "lock selector did not offer every concept");
  assert(elements.get("concept-intent-grid").hidden === false, "authored concept intent was hidden");
  assert(elements.get("concept-intent-cue").textContent, "domain intent was not rendered");
  assert(elements.get("concept-intent-geometry").textContent, "architectural move was not rendered");
  assert(elements.get("concept-intent-thesis").textContent, "design thesis was not rendered");
  const firstIntentName = elements.get("concept-intent-name").textContent;
  const alternateConcept = elements.get("lock-candidate").options.find(option => option.value !== api.selectedReviewAssetId);
  elements.get("lock-candidate").value = alternateConcept.value;
  elements.get("lock-candidate").dispatchEvent({ type: "change", target: elements.get("lock-candidate") });
  assert(elements.get("concept-intent-name").textContent !== firstIntentName, "intent panel did not follow the selected finalist");
  assert(api.selectedReviewAssetId === elements.get("lock-candidate").value, "review board selection did not follow the concept selector");

  elements.get("annotation-kind").value = "keep";
  elements.get("annotation-category").value = "silhouette";
  elements.get("annotation-note").value = "Preserve this stepped outer silhouette.";
  elements.get("annotation-surface").dispatchEvent({ type: "pointerdown", pointerId: 1, button: 0, clientX: 100, clientY: 120, preventDefault() {} });
  elements.get("annotation-surface").dispatchEvent({ type: "pointermove", pointerId: 1, clientX: 460, clientY: 520, preventDefault() {} });
  elements.get("annotation-surface").dispatchEvent({ type: "pointerup", pointerId: 1, clientX: 460, clientY: 520, preventDefault() {} });
  assert(api.currentAnnotationCount === 1, "drag annotation did not persist");
  assert(elements.get("annotation-list").children.length === 1, "annotation list did not render the saved mark");
  assert(elements.get("annotation-summary").textContent.includes("1 keep"), "annotation summary did not describe the keep signal");
  const firstAnnotatedName = elements.get("concept-intent-name").textContent;
  assert(conceptCardByName(firstAnnotatedName)?.classList.contains("has-direction-keep"), "keep annotation did not color its concept card");

  const secondAnnotatedConcept = elements.get("lock-candidate").options.find(option => option.value !== api.selectedReviewAssetId);
  elements.get("lock-candidate").value = secondAnnotatedConcept.value;
  elements.get("lock-candidate").dispatchEvent({ type: "change", target: elements.get("lock-candidate") });
  const secondAnnotatedName = elements.get("concept-intent-name").textContent;
  elements.get("annotation-kind").value = "change";
  elements.get("annotation-category").value = "domain-cue";
  elements.get("annotation-note").value = "Carry the company cue forward with less literal branding.";
  elements.get("annotation-whole").click();
  assert(api.currentAnnotationCount === 2, "whole-concept annotation did not persist");
  assert(elements.get("annotation-summary").textContent.includes("across 2 concepts"), "annotation summary lost cross-concept direction");
  assert(conceptCardByName(secondAnnotatedName)?.classList.contains("has-direction-change"), "change annotation did not color its concept card");

  const usedConceptIds = new Set([secondAnnotatedConcept.value]);
  const firstAnnotatedOption = elements.get("lock-candidate").options.find(option => option.textContent.startsWith(`${firstAnnotatedName} -`));
  if (firstAnnotatedOption) usedConceptIds.add(firstAnnotatedOption.value);
  const thirdAnnotatedConcept = elements.get("lock-candidate").options.find(option => !usedConceptIds.has(option.value));
  elements.get("lock-candidate").value = thirdAnnotatedConcept.value;
  elements.get("lock-candidate").dispatchEvent({ type: "change", target: elements.get("lock-candidate") });
  const thirdAnnotatedName = elements.get("concept-intent-name").textContent;
  elements.get("annotation-kind").value = "avoid";
  elements.get("annotation-category").value = "overall-form";
  elements.get("annotation-note").value = "Do not carry this overall massing forward.";
  elements.get("annotation-whole").click();
  assert(conceptCardByName(thirdAnnotatedName)?.classList.contains("has-direction-avoid"), "avoid annotation did not color its concept card");

  elements.get("lock-candidate").value = secondAnnotatedConcept.value;
  elements.get("lock-candidate").dispatchEvent({ type: "change", target: elements.get("lock-candidate") });
  elements.get("annotation-kind").value = "keep";
  elements.get("annotation-category").value = "layout";
  elements.get("annotation-note").value = "Keep this circulation pattern while changing the company cue.";
  elements.get("annotation-whole").click();
  assert(api.currentAnnotationCount === 4, "cross-concept annotations did not all persist");
  assert(elements.get("annotation-summary").textContent.includes("across 3 concepts"), "annotation summary lost the third annotated concept");
  assert(conceptCardByName(secondAnnotatedName)?.classList.contains("has-direction-mixed"), "mixed feedback did not replace the single-direction card state");
  const annotatedPayload = api.buildResultPayload();
  assert(annotatedPayload.batchDecision.annotations.length === 4, "individual telemetry payload lost the annotations");
  assert(annotatedPayload.batchDecision.annotations[0].region.x === 10 && annotatedPayload.batchDecision.annotations[0].region.width === 36, "drag annotation coordinates were not normalized");

  const reviewNote = "Keep the service courtyard, but replace the generic roofline and entrance massing.";
  elements.get("review-notes").value = reviewNote;
  elements.get("review-notes").dispatchEvent({ type: "input", target: elements.get("review-notes") });
  assert(api.currentReviewConfirmedAt === null, "editing notes did not return the review to draft state");
  assert(elements.get("review-save-status").textContent.includes("Draft saved locally"), "draft save state was not visible");
  elements.get("confirm-review-button").click();
  assert(api.currentReviewConfirmedAt, "explicit review confirmation was not persisted");
  assert(elements.get("confirm-review-button").disabled === true, "confirmed review did not disable the save button");
  assert(elements.get("review-save-status").textContent.includes("Review saved"), "confirmed review state was not visible");
  elements.get("review-disposition").value = "refine";
  elements.get("review-disposition").dispatchEvent({ type: "change", target: elements.get("review-disposition") });
  assert(api.batchRefineCount === 1 && api.batchLockedCount === 0, "refine disposition did not persist");
  assert(api.currentReviewConfirmedAt === null && elements.get("confirm-review-button").disabled === false, "direction change did not return the review to draft state");
  assert(elements.get("batch-progress").textContent.includes("1 refine"), "refine progress was not shown");
  elements.get("review-disposition").value = "combine";
  elements.get("review-disposition").dispatchEvent({ type: "change", target: elements.get("review-disposition") });
  assert(api.batchCombineCount === 1 && api.batchRefineCount === 0, "hybrid disposition did not persist");
  assert(elements.get("batch-progress").textContent.includes("1 hybrid"), "hybrid progress was not shown");
  elements.get("review-disposition").value = "redo";
  elements.get("review-disposition").dispatchEvent({ type: "change", target: elements.get("review-disposition") });
  assert(api.batchRedoCount === 1 && api.batchLockedCount === 0, "full-redesign disposition did not persist");
  assert(elements.get("batch-progress").textContent === "1/53 reviewed | 0 approved | 1 redo | 0 removed | 7 kits | 52 pending", "redesign progress is wrong");

  assert(elements.get("lock-button").textContent === "Approve as production art", "production approval action is ambiguous");
  elements.get("lock-button").click();
  assert(api.batchLockedCount === 1 && api.batchRedoCount === 0, "lock-in did not replace the redesign disposition");
  assert(api.currentReviewConfirmedAt, "production approval did not confirm the review feedback");
  assert(elements.get("lock-button").textContent === "Update production art", "approved production action was not reflected in the button");
  assert(elements.get("lock-status").textContent.includes("Production art approved"), "production approval status was not explicit");
  assert(elements.get("batch-progress").textContent === "1/53 reviewed | 1 approved | 0 redo | 0 removed | 7 kits | 52 pending", "approved progress is wrong");

  exportedBlob = null;
  elements.get("batch-export-results").click();
  const batchResult = JSON.parse(await exportedBlob.text());
  assert(batchResult.summary.setCount === 62, "batch export lost catalog sets");
  assert(batchResult.summary.activeSetCount === 60 && batchResult.summary.excludedCount === 2, "batch export active/excluded summary is wrong");
  assert(batchResult.summary.reviewSetCount === 53 && batchResult.summary.variantKitCount === 7, "batch export review/variant-kit summary is wrong");
  assert(batchResult.attemptRetention?.policy === "latest-completed-review-per-asset" && batchResult.attemptRetention.maximumPerAsset === 1, "batch export did not declare its fresh-session retention policy");
  assert(batchResult.summary.reviewedCount === 1 && batchResult.summary.lockedCount === 1, "batch export review summary is wrong");
  const aceBatchSet = batchResult.sets.find(item => item.catalog.folder === "ace-hardware-city-r2");
  const excludedManifestSet = batchResult.sets.find(item => item.catalog.id === "skill/manifest-v3@v1");
  const excludedSafeWritesSet = batchResult.sets.find(item => item.catalog.id === "skill/safe-writes@v1");
  const variantKitSets = batchResult.sets.filter(item => item.status === "variant-kit");
  assert(aceBatchSet?.record?.attempts?.length === 1, "batch export lost the saved ACE attempt");
  assert(aceBatchSet?.record?.attempts?.[0]?.sessionId === rerunSessionId, "batch export retained the superseded ACE telemetry session");
  assert(aceBatchSet?.record?.lock?.skipNextPass === true, "batch export lost the production lock");
  assert(aceBatchSet?.record?.notes === reviewNote, "batch export lost the review notes");
  assert(aceBatchSet?.record?.attempts?.[0]?.review?.notes === reviewNote, "saved attempt lost its review notes");
  assert(aceBatchSet?.record?.reviewConfirmedAt, "batch export lost explicit review confirmation");
  assert(aceBatchSet?.record?.attempts?.[0]?.review?.reviewConfirmedAt, "saved attempt lost explicit review confirmation");
  assert(aceBatchSet?.record?.annotations?.length === 4, "batch export lost the structured annotations");
  assert(aceBatchSet?.record?.annotationSummary?.annotatedAssetIds?.length === 3, "batch export lost the annotation summary");
  assert(aceBatchSet?.record?.attempts?.[0]?.review?.annotations?.length === 4, "saved attempt lost its annotations");
  assert(excludedManifestSet?.status === "excluded" && excludedManifestSet.catalog.exclusionReason, "Manifest V3 exclusion was not exported");
  assert(excludedSafeWritesSet?.status === "excluded" && excludedSafeWritesSet.catalog.exclusionReason, "Safe Writes exclusion was not exported");
  assert(excludedSafeWritesSet?.record?.attempts?.length === 1 && excludedSafeWritesSet.record.attempts[0].sessionId === "latest-session", "refresh-time normalization retained superseded attempts");
  assert(variantKitSets.length === 7, "batch export lost production variant kits");
  assert(variantKitSets.every(item => item.catalog.variantKitPolicy?.minimumVariants >= 3), "variant-kit policy was not exported");

  elements.get("unlock-button").click();
  assert(api.batchLockedCount === 0 && api.batchReviewedCount === 1, "unlock did not preserve reviewed telemetry");
  elements.get("review-disposition").value = "removed";
  elements.get("review-disposition").dispatchEvent({ type: "change", target: elements.get("review-disposition") });
  assert(api.batchRemovedCount === 1 && api.batchLockedCount === 0, "remove-asset disposition did not persist");
  assert(elements.get("batch-progress").textContent === "1/53 reviewed | 0 approved | 0 redo | 1 removed | 7 kits | 52 pending", "removed progress is wrong");
  exportedBlob = null;
  elements.get("batch-export-results").click();
  const removedBatchResult = JSON.parse(await exportedBlob.text());
  assert(removedBatchResult.summary.removedCount === 1, "batch export lost the removed-asset count");
  assert(removedBatchResult.sets.find(item => item.catalog.folder === "ace-hardware-city-r2")?.status === "removed", "batch export lost the removed disposition");

  elements.get("review-disposition").value = "reviewed";
  elements.get("review-disposition").dispatchEvent({ type: "change", target: elements.get("review-disposition") });
  elements.get("lock-button").click();
  assert(api.batchLockedCount === 1, "re-lock did not persist");
  elements.get("next-tournament-button").click();
  assert(api.phase === "setup" && api.assetCount === 10, "next unlocked tournament did not load its folder manifest");
  assert(elements.get("set-name").value !== "ACE Hardware City · Round 2", "next unlocked tournament did not advance");
  assert(sandbox.location.search.includes("set="), "selector route was not preserved in the URL");
  elements.get("new-set-button").click();

  const folderDefinitionPath = path.join(toolRoot, "concept-tournaments", "ace-hardware-city-r2", "tournament-set.json");
  const folderDefinitionText = fs.readFileSync(folderDefinitionPath, "utf8");
  const folderDefinition = JSON.parse(folderDefinitionText);
  const folderFiles = [{
    name: "tournament-set.json",
    type: "application/json",
    size: folderDefinitionText.length,
    lastModified: 1900000000000,
    webkitRelativePath: "ace-hardware-city-r2/tournament-set.json",
    async text() { return folderDefinitionText; }
  }].concat(folderDefinition.assets.map((asset, index) => ({
    name: asset.src,
    type: "image/png",
    size: 5000 + index,
    lastModified: 1900000000100 + index,
    webkitRelativePath: `ace-hardware-city-r2/${asset.src}`
  })));
  await api.loadFolderFiles(folderFiles);
  assert(api.assetCount === 10, "folder manifest did not load ten concepts");
  assert(elements.get("set-name").value === "ACE Hardware City · Round 2", "folder manifest name did not load");
  elements.get("start-button").click();
  guard = 0;
  while (api.phase === "play" && guard++ < 20) elements.get("candidate-left").click();
  elements.get("second-run-button").click();
  guard = 0;
  while (api.phase === "play" && guard++ < 20) elements.get("candidate-right").click();
  guard = 0;
  while (api.phase === "calibration" && guard++ < 20) elements.get("candidate-left").click();
  exportedBlob = null;
  elements.get("export-button").click();
  const folderResult = JSON.parse(await exportedBlob.text());
  assert(folderResult.source.kind === "folder-manifest", "folder manifest source was not exported");
  assert(folderResult.assets.every(asset => asset.metadata.controlledVariable), "folder metadata was not preserved");
  elements.get("new-set-button").click();

  for (const count of [2, 3, 10, 17, 64]) {
    const generalFiles = Array.from({ length: count }, (_, index) => ({
      name: `set-${count}-concept-${index + 1}.webp`,
      type: "image/webp",
      size: count * 1000 + index,
      lastModified: 1800000000000 + count * 100 + index,
      webkitRelativePath: `set-${count}/set-${count}-concept-${index + 1}.webp`
    }));
    fileInput.files = generalFiles;
    fileInput.dispatchEvent({ type: "change", target: fileInput });
    assert(api.assetCount === count, `${count}-image set did not load`);
    elements.get("start-button").click();

    let firstVotes = 0;
    while (api.phase === "play" && firstVotes <= count) {
      elements.get("candidate-left").click();
      firstVotes += 1;
    }
    assert(api.phase === "between", `${count}-image run 1 did not finish`);
    assert(firstVotes === count - 1, `${count}-image run 1 used the wrong number of votes`);
    elements.get("second-run-button").click();

    let secondVotes = 0;
    while (api.phase === "play" && secondVotes <= count) {
      elements.get("candidate-right").click();
      secondVotes += 1;
    }
    assert(api.phase === "calibration", `${count}-image run 2 did not start calibration`);
    assert(secondVotes === count - 1, `${count}-image run 2 used the wrong number of votes`);

    const calibrationCandidateCount = Math.min(4, count);
    const expectedCalibrationVotes = calibrationCandidateCount * (calibrationCandidateCount - 1) / 2;
    let calibrationVotes = 0;
    while (api.phase === "calibration" && calibrationVotes <= expectedCalibrationVotes) {
      elements.get("candidate-left").click();
      calibrationVotes += 1;
    }
    assert(api.phase === "results", `${count}-image calibration did not finish`);
    assert(calibrationVotes === expectedCalibrationVotes, `${count}-image calibration used the wrong number of votes`);

    exportedBlob = null;
    elements.get("export-button").click();
    const generalResult = JSON.parse(await exportedBlob.text());
    assert(
      generalResult.runs.every(run => run.rounds.length === Math.ceil(Math.log2(count))),
      `${count}-image bracket has the wrong round count`
    );
    assert(
      generalResult.runs.every(run => run.rounds.flatMap(round => round.matches).filter(match => !match.automaticBye).length === count - 1),
      `${count}-image bracket has the wrong comparison count`
    );
    assert(
      generalResult.runs.every(run => run.rounds.slice(1).every(round => round.matches.every(match => !match.automaticBye))),
      `${count}-image bracket has a bye after round one`
    );
    assert(
      generalResult.runs.every(run => run.rounds[0].matches.filter(match => match.automaticBye).length === (2 ** Math.ceil(Math.log2(count))) - count),
      `${count}-image bracket has the wrong opening bye count`
    );
    assert(generalResult.calibration.comparisons.length === expectedCalibrationVotes, `${count}-image calibration export is incomplete`);
    assert(
      generalResult.runs[0].seedOrder.map(item => item.id).join("|") !== generalResult.runs[1].seedOrder.map(item => item.id).join("|"),
      `${count}-image seed sequences did not change`
    );
    if (count > 2) {
      assert(
        generalResult.runs[0].openingPairSignature !== generalResult.runs[1].openingPairSignature,
        `${count}-image opening pairings did not change`
      );
    }

    elements.get("new-set-button").click();
    assert(api.phase === "setup" && api.assetCount === 0, `${count}-image reset failed`);
  }

  console.log("DOM startup: PASS");
  console.log("5-image tournament x2: PASS");
  console.log("Blind names/undo/byes/reseed/export/reset: PASS");
  console.log("Mirrored repeats/top-four calibration: PASS");
  console.log("URL and folder manifests/metadata/tag signals: PASS");
  console.log("53-review/7-kit/2-excluded selector, intent, notes, dispositions, export, and routing: PASS");
  console.log("Generalized counts 2, 3, 10, 17, 64: PASS");
}

main().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
