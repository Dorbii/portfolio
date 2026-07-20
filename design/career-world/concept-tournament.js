    (() => {
      "use strict";

      // Configuration and application state
      const MIN_ASSETS = 2;
      const MAX_ASSETS = 64;
      const VERSION = 3;
      const TELEMETRY_VERSION = 1;
      const MANIFEST_GLOBAL = "__CONCEPT_TOURNAMENT_SET__";
      const CATALOG_GLOBAL = "__CONCEPT_TOURNAMENT_CATALOG__";
      const BATCH_STORAGE_KEY = "art-review-concept-tournament-batch-v1";
      const LEGACY_BATCH_STORAGE_KEY = "career-world-concept-tournament-batch-v1";
      const BATCH_SCHEMA_VERSION = 1;
      const MAX_SAVED_ATTEMPTS_PER_SET = 1;
      const REVIEW_DISPOSITIONS = new Set(["reviewed", "refine", "combine", "redo", "removed"]);
      const ANNOTATION_KINDS = new Set(["keep", "change", "avoid"]);
      const ANNOTATION_CATEGORY_LABELS = Object.freeze({
        "overall-form": "Overall form",
        silhouette: "Silhouette",
        orientation: "Orientation",
        layout: "Building layout",
        "domain-cue": "Company / technology cue",
        scale: "Scale and grandeur",
        "detail-density": "Detail density",
        "facade-entrance": "Facade / entrance",
        "roof-tower": "Roof / tower",
        "negative-space": "Negative space",
        other: "Other"
      });
      let nextAssetId = 1;
      let reviewNotesSaveTimer = null;
      let reviewDraftDirty = false;

      const catalogDefinition = window[CATALOG_GLOBAL];
      delete window[CATALOG_GLOBAL];

      const state = {
        phase: "setup",
        assets: [],
        loadedSet: null,
        revealNames: false,
        runs: [],
        activeRunIndex: -1,
        calibration: null,
        reviewAssetId: null,
        annotationDraft: null,
        telemetry: createTelemetrySession(),
        catalog: normalizeCatalog(catalogDefinition),
        batch: readBatchState(),
        manifestLoadToken: 0
      };

      const els = {
        setupScreen: document.querySelector("#setup-screen"),
        playScreen: document.querySelector("#play-screen"),
        betweenScreen: document.querySelector("#between-screen"),
        resultsScreen: document.querySelector("#results-screen"),
        setName: document.querySelector("#set-name"),
        fileInput: document.querySelector("#file-input"),
        folderInput: document.querySelector("#folder-input"),
        loadError: document.querySelector("#load-error"),
        loadedSource: document.querySelector("#loaded-source"),
        batchLoader: document.querySelector("#batch-loader"),
        tournamentSelect: document.querySelector("#tournament-select"),
        batchProgress: document.querySelector("#batch-progress"),
        nextUnlockedSetup: document.querySelector("#next-unlocked-setup"),
        batchExportSetup: document.querySelector("#batch-export-setup"),
        assetCount: document.querySelector("#asset-count"),
        assetEmpty: document.querySelector("#asset-empty"),
        assetList: document.querySelector("#asset-list"),
        reviewReadyName: document.querySelector("#review-ready-name"),
        comparisonEstimate: document.querySelector("#comparison-estimate"),
        startButton: document.querySelector("#start-button"),
        matchTitle: document.querySelector("#match-title"),
        runLabel: document.querySelector("#run-label"),
        roundLabel: document.querySelector("#round-label"),
        progressLabel: document.querySelector("#progress-label"),
        progressBar: document.querySelector("#progress-bar"),
        toggleNames: document.querySelector("#toggle-names"),
        undoButton: document.querySelector("#undo-button"),
        candidateLeft: document.querySelector("#candidate-left"),
        candidateRight: document.querySelector("#candidate-right"),
        leftImage: document.querySelector("#left-image"),
        rightImage: document.querySelector("#right-image"),
        leftName: document.querySelector("#left-name"),
        rightName: document.querySelector("#right-name"),
        telemetrySession: document.querySelector("#telemetry-session"),
        telemetryDecisions: document.querySelector("#telemetry-decisions"),
        bracketTitle: document.querySelector("#bracket-title"),
        bracketNote: document.querySelector("#bracket-note"),
        bracket: document.querySelector("#bracket"),
        betweenTitle: document.querySelector("#between-title"),
        firstChampionImage: document.querySelector("#first-champion-image"),
        betweenUndo: document.querySelector("#between-undo"),
        secondRunButton: document.querySelector("#second-run-button"),
        resultSummary: document.querySelector("#result-summary"),
        resultVerdict: document.querySelector("#result-verdict"),
        resultOneImage: document.querySelector("#result-one-image"),
        resultTwoImage: document.querySelector("#result-two-image"),
        resultOneName: document.querySelector("#result-one-name"),
        resultTwoName: document.querySelector("#result-two-name"),
        metricDecisions: document.querySelector("#metric-decisions"),
        metricMedian: document.querySelector("#metric-median"),
        metricSide: document.querySelector("#metric-side"),
        metricRepeat: document.querySelector("#metric-repeat"),
        conceptContactSheet: document.querySelector("#concept-contact-sheet"),
        annotationConceptName: document.querySelector("#annotation-concept-name"),
        annotationSurface: document.querySelector("#annotation-surface"),
        annotationImage: document.querySelector("#annotation-image"),
        annotationOverlay: document.querySelector("#annotation-overlay"),
        annotationDraft: document.querySelector("#annotation-draft"),
        annotationKind: document.querySelector("#annotation-kind"),
        annotationCategory: document.querySelector("#annotation-category"),
        annotationNote: document.querySelector("#annotation-note"),
        annotationWhole: document.querySelector("#annotation-whole"),
        annotationSummary: document.querySelector("#annotation-summary"),
        annotationCount: document.querySelector("#annotation-count"),
        annotationList: document.querySelector("#annotation-list"),
        annotationEmpty: document.querySelector("#annotation-empty"),
        resultsUndo: document.querySelector("#results-undo"),
        exportButton: document.querySelector("#export-button"),
        batchExportResults: document.querySelector("#batch-export-results"),
        rerunButton: document.querySelector("#rerun-button"),
        nextTournamentButton: document.querySelector("#next-tournament-button"),
        newSetButton: document.querySelector("#new-set-button"),
        lockCandidate: document.querySelector("#lock-candidate"),
        lockButton: document.querySelector("#lock-button"),
        unlockButton: document.querySelector("#unlock-button"),
        lockStatus: document.querySelector("#lock-status"),
        conceptIntentName: document.querySelector("#concept-intent-name"),
        conceptIntentGrid: document.querySelector("#concept-intent-grid"),
        conceptIntentCue: document.querySelector("#concept-intent-cue"),
        conceptIntentGeometry: document.querySelector("#concept-intent-geometry"),
        conceptIntentThesis: document.querySelector("#concept-intent-thesis"),
        conceptIntentEmpty: document.querySelector("#concept-intent-empty"),
        reviewDisposition: document.querySelector("#review-disposition"),
        reviewNotes: document.querySelector("#review-notes"),
        confirmReviewButton: document.querySelector("#confirm-review-button"),
        reviewSaveStatus: document.querySelector("#review-save-status"),
        announcer: document.querySelector("#announcer")
      };

      function isImageFile(file) {
        return Boolean(file && (
          file.type.startsWith("image/") ||
          /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(file.name)
        ));
      }

      function deriveName(filename) {
        const stem = filename.replace(/\.[^.]+$/, "");
        const cleaned = stem
          .replace(/(?:^|[-_ ])(?:concept|candidate|option)(?=[-_ ]|\d|$)/gi, " ")
          .replace(/[-_]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        return (cleaned || stem).replace(/\b[a-z]/g, letter => letter.toUpperCase());
      }

      function clamp(value, minimum, maximum) {
        return Math.min(maximum, Math.max(minimum, value));
      }

      function roundRegionValue(value) {
        return Math.round(value * 100) / 100;
      }

      function normalizeAnnotation(annotation) {
        if (!annotation || typeof annotation !== "object" || Array.isArray(annotation)) return null;
        const assetId = typeof annotation.assetId === "string" ? annotation.assetId.trim() : "";
        const kind = ANNOTATION_KINDS.has(annotation.kind) ? annotation.kind : null;
        const category = Object.prototype.hasOwnProperty.call(ANNOTATION_CATEGORY_LABELS, annotation.category)
          ? annotation.category
          : "other";
        const rawRegion = annotation.region && typeof annotation.region === "object" ? annotation.region : null;
        const values = rawRegion
          ? [rawRegion.x, rawRegion.y, rawRegion.width, rawRegion.height].map(Number)
          : [];
        if (!assetId || !kind || values.length !== 4 || values.some(value => !Number.isFinite(value))) return null;

        const x = clamp(values[0], 0, 99.5);
        const y = clamp(values[1], 0, 99.5);
        const width = clamp(values[2], .5, 100 - x);
        const height = clamp(values[3], .5, 100 - y);
        return {
          id: typeof annotation.id === "string" && annotation.id.trim() ? annotation.id.trim() : createSessionId().replace(/^ct-/, "mark-"),
          assetId,
          kind,
          category,
          note: typeof annotation.note === "string" ? annotation.note.slice(0, 500).trim() : "",
          region: {
            x: roundRegionValue(x),
            y: roundRegionValue(y),
            width: roundRegionValue(width),
            height: roundRegionValue(height)
          },
          createdAt: typeof annotation.createdAt === "string" ? annotation.createdAt : new Date().toISOString()
        };
      }

      function normalizeAnnotations(value) {
        return Array.isArray(value) ? value.map(normalizeAnnotation).filter(Boolean) : [];
      }

      function buildAnnotationSummary(value) {
        const annotations = normalizeAnnotations(value);
        const counts = { keep: 0, change: 0, avoid: 0 };
        const categoryCounts = {};
        const assetIds = [];
        annotations.forEach(annotation => {
          counts[annotation.kind] += 1;
          categoryCounts[annotation.category] = (categoryCounts[annotation.category] || 0) + 1;
          if (!assetIds.includes(annotation.assetId)) assetIds.push(annotation.assetId);
        });
        return {
          total: annotations.length,
          annotatedAssetIds: assetIds,
          counts,
          categoryCounts
        };
      }

      function assetById(id) {
        return state.assets.find(asset => asset.id === id);
      }

      function fileKey(file) {
        return [file.name, file.size, file.lastModified].join("::");
      }

      function setError(message = "") {
        els.loadError.textContent = message;
      }

      // Catalog normalization and local persistence
      function normalizeCatalog(definition) {
        const entries = Array.isArray(definition?.entries)
          ? definition.entries.filter(entry => (
            entry &&
            typeof entry.id === "string" && entry.id.trim() &&
            typeof entry.name === "string" && entry.name.trim() &&
            typeof entry.manifestPath === "string" && entry.manifestPath.trim()
          )).map(entry => ({
            id: entry.id.trim(),
            name: entry.name.trim(),
            category: String(entry.category || "other").trim().toLowerCase(),
            folder: String(entry.folder || "").trim(),
            manifestPath: entry.manifestPath.trim(),
            status: String(entry.status || "queued").trim(),
            imageCount: Number(entry.imageCount) || 0,
            exclusionReason: typeof entry.exclusionReason === "string" ? entry.exclusionReason.trim() : null,
            variantKitPolicy: entry.variantKitPolicy && typeof entry.variantKitPolicy === "object"
              ? {
                  minimumVariants: Number(entry.variantKitPolicy.minimumVariants) || 0,
                  reason: typeof entry.variantKitPolicy.reason === "string" ? entry.variantKitPolicy.reason.trim() : null,
                  variationAxes: Array.isArray(entry.variantKitPolicy.variationAxes)
                    ? entry.variantKitPolicy.variationAxes.filter(value => typeof value === "string")
                    : []
                }
              : null
          }))
          : [];
        return {
          schemaVersion: Number(definition?.schemaVersion) || 1,
          generatedAt: definition?.generatedAt || null,
          entries
        };
      }

      function emptyBatchState() {
        return {
          schemaVersion: BATCH_SCHEMA_VERSION,
          createdAt: new Date().toISOString(),
          updatedAt: null,
          records: {},
          storageError: null
        };
      }

      function readBatchState() {
        const fallback = emptyBatchState();
        try {
          const raw = localStorage.getItem(BATCH_STORAGE_KEY) || localStorage.getItem(LEGACY_BATCH_STORAGE_KEY);
          if (!raw) return fallback;
          const parsed = JSON.parse(raw);
          if (!parsed || parsed.schemaVersion !== BATCH_SCHEMA_VERSION || !parsed.records || typeof parsed.records !== "object" || Array.isArray(parsed.records)) {
            return fallback;
          }
          const records = Object.fromEntries(Object.entries(parsed.records).filter(([, record]) => (
            record && typeof record === "object" && !Array.isArray(record)
          )).map(([id, record]) => {
            const annotations = normalizeAnnotations(record.annotations);
            return [id, {
              ...record,
              attempts: Array.isArray(record.attempts)
                ? record.attempts.filter(attempt => attempt && typeof attempt === "object" && !Array.isArray(attempt)).slice(-MAX_SAVED_ATTEMPTS_PER_SET)
                : [],
              disposition: REVIEW_DISPOSITIONS.has(record.disposition)
                ? record.disposition
                : (record.lock || record.attempts?.length ? "reviewed" : null),
              notes: typeof record.notes === "string" ? record.notes : "",
              reviewConfirmedAt: typeof record.reviewConfirmedAt === "string"
                ? record.reviewConfirmedAt
                : (typeof record.lock?.lockedAt === "string" ? record.lock.lockedAt : null),
              annotations,
              annotationSummary: buildAnnotationSummary(annotations)
            }];
          }));
          return {
            schemaVersion: BATCH_SCHEMA_VERSION,
            createdAt: parsed.createdAt || fallback.createdAt,
            updatedAt: parsed.updatedAt || null,
            records,
            storageError: null
          };
        } catch (error) {
          fallback.storageError = error instanceof Error ? error.message : String(error);
          return fallback;
        }
      }

      function batchRecordForEntry(entry) {
        if (!entry) return null;
        const record = state.batch.records[entry.id] || null;
        if (record?.manifestPath && record.manifestPath !== entry.manifestPath) return null;
        return record;
      }

      function batchStatusForEntry(entry) {
        if (entry?.status === "excluded") return "excluded";
        if (entry?.status === "variant-kit") return "variant-kit";
        const record = batchRecordForEntry(entry);
        if (record?.lock?.asset?.id) return "locked";
        if (record?.disposition === "removed") return "removed";
        if (record?.disposition === "redo") return "redo";
        if (record?.disposition === "refine") return "refine";
        if (record?.disposition === "combine") return "combine";
        if (Array.isArray(record?.attempts) && record.attempts.length) return "reviewed";
        return "pending";
      }

      function batchStatusLabel(status) {
        return ({
          locked: "APPROVED",
          refine: "REFINE",
          combine: "HYBRID",
          redo: "REDO",
          removed: "REMOVED",
          reviewed: "REVIEWED",
          excluded: "EXCLUDED",
          "variant-kit": "KIT",
          pending: "PENDING"
        })[status] || status.toUpperCase();
      }

      function catalogEntryById(id) {
        return state.catalog.entries.find(entry => entry.id === id) || null;
      }

      function catalogEntryForManifestUrl(urlValue) {
        let target;
        try {
          target = new URL(urlValue, window.location.href).href;
        } catch {
          return null;
        }
        return state.catalog.entries.find(entry => {
          try {
            return new URL(entry.manifestPath, window.location.href).href === target;
          } catch {
            return false;
          }
        }) || null;
      }

      function currentCatalogEntry() {
        return catalogEntryById(state.loadedSet?.catalogId);
      }

      function ensureBatchRecord(entry) {
        const current = batchRecordForEntry(entry);
        if (current) return current;
        const record = {
          catalogId: entry.id,
          name: entry.name,
          category: entry.category,
          folder: entry.folder,
          manifestPath: entry.manifestPath,
          assets: [],
          attempts: [],
          lock: null,
          disposition: null,
          notes: "",
          reviewConfirmedAt: null,
          annotations: [],
          annotationSummary: buildAnnotationSummary([]),
          updatedAt: null
        };
        state.batch.records[entry.id] = record;
        return record;
      }

      function refreshTournamentOptions() {
        const select = els.tournamentSelect;
        if (!select) return;
        const selected = currentCatalogEntry()?.manifestPath || select.value || "";
        select.textContent = "";
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = state.catalog.entries.length
          ? "Select an asset tournament..."
          : "Local tournament catalog unavailable";
        select.append(placeholder);

        const categoryLabels = {
          city: "Cities",
          project: "Projects",
          skill: "Skills",
          ambient: "Ambient and mobility",
          character: "Characters",
          environment: "Environments",
          prop: "Props",
          vehicle: "Vehicles",
          interface: "Interface art"
        };
        const preferredOrder = ["city", "project", "skill", "ambient", "character", "environment", "prop", "vehicle", "interface"];
        const categories = [...new Set(state.catalog.entries
          .filter(entry => entry.status === "ready")
          .map(entry => entry.category))]
          .sort((left, right) => {
            const leftIndex = preferredOrder.indexOf(left);
            const rightIndex = preferredOrder.indexOf(right);
            if (leftIndex >= 0 || rightIndex >= 0) return (leftIndex < 0 ? 999 : leftIndex) - (rightIndex < 0 ? 999 : rightIndex);
            return left.localeCompare(right);
          });
        categories.forEach(category => {
          const entries = state.catalog.entries.filter(entry => entry.category === category && entry.status === "ready");
          if (!entries.length) return;
          const group = document.createElement("optgroup");
          group.label = categoryLabels[category] || category.replace(/[-_]+/g, " ").replace(/\b[a-z]/g, letter => letter.toUpperCase());
          entries.forEach(entry => {
            const option = document.createElement("option");
            const status = batchStatusForEntry(entry);
            option.value = entry.manifestPath;
            option.textContent = `[${batchStatusLabel(status)}] ${entry.name}`;
            group.append(option);
          });
          select.append(group);
        });
        select.disabled = !state.catalog.entries.some(entry => entry.status === "ready");
        if ([...select.options].some(option => option.value === selected)) select.value = selected;
      }

      function renderBatchControls() {
        if (!els.tournamentSelect) return;
        const reviewEntries = state.catalog.entries.filter(entry => entry.status === "ready");
        const statuses = reviewEntries.map(batchStatusForEntry);
        const total = reviewEntries.length;
        const kitCount = state.catalog.entries.filter(entry => entry.status === "variant-kit").length;
        const locked = statuses.filter(status => status === "locked").length;
        const refine = statuses.filter(status => status === "refine").length;
        const combine = statuses.filter(status => status === "combine").length;
        const redo = statuses.filter(status => status === "redo").length;
        const removed = statuses.filter(status => status === "removed").length;
        const reviewed = statuses.filter(status => status !== "pending").length;
        const pending = Math.max(0, total - reviewed);
        const directionStatus = [
          `${locked} approved`,
          refine ? `${refine} refine` : null,
          combine ? `${combine} hybrid` : null,
          `${redo} redo`,
          `${removed} removed`
        ].filter(Boolean).join(" | ");
        els.batchProgress.textContent = total
          ? `${reviewed}/${total} reviewed | ${directionStatus} | ${kitCount} kits | ${pending} pending`
          : "Catalog unavailable";
        const hasRecords = reviewed > 0 || state.catalog.entries.some(entry => entry.status === "excluded" || entry.status === "variant-kit");
        const hasUnlocked = statuses.some(status => status !== "locked" && status !== "removed");
        els.batchExportSetup.disabled = !hasRecords;
        els.batchExportResults.disabled = !hasRecords;
        els.nextUnlockedSetup.disabled = !hasUnlocked || !total;
        els.nextTournamentButton.disabled = !hasUnlocked || !total;
        const current = currentCatalogEntry();
        if (current && els.tournamentSelect.value !== current.manifestPath) {
          els.tournamentSelect.value = current.manifestPath;
        }
      }

      function writeBatchState() {
        state.batch.updatedAt = new Date().toISOString();
        state.batch.storageError = null;
        try {
          localStorage.setItem(BATCH_STORAGE_KEY, JSON.stringify({
            schemaVersion: state.batch.schemaVersion,
            createdAt: state.batch.createdAt,
            updatedAt: state.batch.updatedAt,
            records: state.batch.records
          }));
        } catch (error) {
          state.batch.storageError = error instanceof Error ? error.message : String(error);
          setError(`Could not save batch progress locally: ${state.batch.storageError}`);
        }
        refreshTournamentOptions();
        renderBatchControls();
      }

      function createSessionId() {
        const random = new Uint32Array(1);
        crypto.getRandomValues(random);
        return `ct-${Date.now().toString(36)}-${random[0].toString(36)}`;
      }

      function sourceDescriptor() {
        if (state.loadedSet) {
          return {
            kind: state.loadedSet.kind || "manifest",
            id: state.loadedSet.id,
            catalogId: state.loadedSet.catalogId || null,
            category: state.loadedSet.category || null,
            name: state.loadedSet.name,
            sourcePath: state.loadedSet.sourcePath,
            manifestUrl: state.loadedSet.manifestUrl || null,
            manifestPath: state.loadedSet.manifestPath || null
          };
        }

        const relativePath = state.assets.find(asset => asset.relativePath)?.relativePath || null;
        return {
          kind: "local-files",
          sourcePath: relativePath && relativePath.includes("/") ? relativePath.split("/")[0] : null
        };
      }

      function createTelemetrySession(source = null) {
        return {
          schemaVersion: TELEMETRY_VERSION,
          sessionId: createSessionId(),
          startedAt: new Date().toISOString(),
          completedAt: null,
          source,
          nextSequence: 1,
          events: []
        };
      }

      function resetTelemetry() {
        state.telemetry = createTelemetrySession(sourceDescriptor());
      }

      function recordEvent(type, details = {}) {
        const event = {
          sequence: state.telemetry.nextSequence++,
          type,
          at: new Date().toISOString(),
          ...details
        };
        state.telemetry.events.push(event);
        return event;
      }

      function inferSetName(files) {
        if (els.setName.value.trim() || !files.length) return;
        const relative = files[0].webkitRelativePath || "";
        if (!relative.includes("/")) return;
        const folder = relative.split("/")[0];
        els.setName.value = deriveName(folder);
      }

      function addFiles(fileList) {
        const supplied = Array.from(fileList || []);
        const imageFiles = supplied.filter(isImageFile);

        if (!imageFiles.length) {
          setError(supplied.length ? "No supported image files were found in that selection." : "No files selected.");
          return;
        }

        if (state.loadedSet) {
          releaseAssets();
          state.loadedSet = null;
          state.runs = [];
          state.activeRunIndex = -1;
          state.calibration = null;
          state.reviewAssetId = null;
          state.annotationDraft = null;
          state.telemetry = createTelemetrySession();
          els.setName.value = "";
        }

        inferSetName(imageFiles);
        const existingKeys = new Set(state.assets.map(asset => asset.fileKey));
        const uniqueFiles = imageFiles.filter(file => !existingKeys.has(fileKey(file)));
        const room = MAX_ASSETS - state.assets.length;
        const accepted = uniqueFiles.slice(0, room);

        accepted.forEach(file => {
          state.assets.push({
            id: `asset-${nextAssetId++}`,
            name: deriveName(file.name),
            fileName: file.name,
            fileType: file.type || "unknown",
            fileSize: file.size,
            lastModified: file.lastModified || null,
            relativePath: file.webkitRelativePath || null,
            fileKey: fileKey(file),
            url: URL.createObjectURL(file),
            revokeOnRelease: true,
            sourceKind: "file",
            metadata: null
          });
        });

        state.assets.sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { numeric: true }));

        const ignored = imageFiles.length - accepted.length;
        if (ignored > 0) {
          const reason = state.assets.length >= MAX_ASSETS ? `The limit is ${MAX_ASSETS} images.` : "Duplicate files were ignored.";
          setError(`${ignored} image${ignored === 1 ? " was" : "s were"} not added. ${reason}`);
        } else {
          setError();
        }

        renderSetup();
      }

      function removeAsset(id) {
        const index = state.assets.findIndex(asset => asset.id === id);
        if (index < 0) return;
        if (state.assets[index].revokeOnRelease) URL.revokeObjectURL(state.assets[index].url);
        state.assets.splice(index, 1);
        setError();
        renderSetup();
      }

      function releaseAssets() {
        state.assets.forEach(asset => {
          if (asset.revokeOnRelease) URL.revokeObjectURL(asset.url);
        });
        state.assets = [];
      }

      function normalizeManifestMetadata(entry) {
        const tags = Array.isArray(entry.tags)
          ? entry.tags.filter(tag => typeof tag === "string").map(tag => tag.trim()).filter(Boolean)
          : [];
        return {
          tags,
          thesis: typeof entry.thesis === "string" ? entry.thesis.trim() : null,
          businessCue: typeof entry.businessCue === "string" ? entry.businessCue.trim() : null,
          role: typeof entry.role === "string" ? entry.role.trim() : null,
          controlledVariable: typeof entry.controlledVariable === "string" ? entry.controlledVariable.trim() : null,
          parentConcept: typeof entry.parentConcept === "string" ? entry.parentConcept.trim() : null
        };
      }

      function validateSetDefinition(definition) {
        if (!definition || typeof definition !== "object" || !Array.isArray(definition.assets)) {
          throw new Error("The set manifest does not contain an assets array.");
        }
        if (definition.assets.length < MIN_ASSETS || definition.assets.length > MAX_ASSETS) {
          throw new Error(`The set manifest must contain ${MIN_ASSETS}-${MAX_ASSETS} assets.`);
        }
      }

      function normalizeRelativePath(value) {
        return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
      }

      async function loadFolderFiles(fileList) {
        const supplied = Array.from(fileList || []);
        const manifestFile = supplied.find(file => /(?:^|\/)tournament-set\.json$/i.test(
          String(file.webkitRelativePath || file.name).replace(/\\/g, "/")
        ));

        if (!manifestFile) {
          addFiles(supplied);
          if (supplied.some(isImageFile)) {
            setError("Loaded without tournament-set.json. Voting works, but exported preference tags will be unavailable.");
          }
          return;
        }

        try {
          const definition = JSON.parse(await manifestFile.text());
          validateSetDefinition(definition);
          const imageFiles = supplied.filter(isImageFile);
          const seenIds = new Set();
          const assets = definition.assets.map((entry, index) => {
            if (!entry || typeof entry.src !== "string" || !entry.src.trim()) {
              throw new Error(`Asset ${index + 1} is missing a source path.`);
            }
            const sourcePath = normalizeRelativePath(entry.src);
            const fileName = sourcePath.split("/").pop();
            const file = imageFiles.find(candidate => {
              const relative = normalizeRelativePath(candidate.webkitRelativePath || candidate.name);
              return relative === sourcePath || relative.endsWith(`/${sourcePath}`) || (
                !sourcePath.includes("/") && normalizeRelativePath(candidate.name) === fileName
              );
            });
            if (!file) throw new Error(`Could not find image for ${entry.src}.`);

            const id = String(entry.id || `manifest-asset-${index + 1}`).trim();
            if (!id || seenIds.has(id)) throw new Error(`Asset ${index + 1} has a missing or duplicate id.`);
            seenIds.add(id);
            return {
              id,
              name: typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : deriveName(file.name),
              fileName: file.name,
              fileType: file.type || "unknown",
              fileSize: file.size,
              lastModified: file.lastModified || null,
              relativePath: file.webkitRelativePath || entry.src,
              fileKey: `folder-manifest::${fileKey(file)}`,
              url: URL.createObjectURL(file),
              revokeOnRelease: true,
              sourceKind: "folder-manifest",
              metadata: normalizeManifestMetadata(entry)
            };
          });

          releaseAssets();
          state.assets = assets;
          state.loadedSet = {
            kind: "folder-manifest",
            id: String(definition.id || "folder-manifest-set"),
            name: String(definition.name || "Concept set"),
            sourcePath: typeof definition.sourcePath === "string"
              ? definition.sourcePath
              : String(manifestFile.webkitRelativePath || manifestFile.name).replace(/\/[^/]+$/, ""),
            manifestUrl: null
          };
          state.phase = "setup";
          state.runs = [];
          state.activeRunIndex = -1;
          state.calibration = null;
          state.reviewAssetId = null;
          state.annotationDraft = null;
          state.revealNames = false;
          state.telemetry = createTelemetrySession(sourceDescriptor());
          els.setName.value = state.loadedSet.name;
          setError();
          render();
        } catch (error) {
          setError(`Could not load folder manifest: ${error.message}`);
          renderSetup();
        }
      }

      function loadSetDefinition(definition, manifestUrlValue) {
        validateSetDefinition(definition);

        const manifestUrl = new URL(manifestUrlValue, window.location.href);
        const catalogEntry = catalogEntryForManifestUrl(manifestUrl.href);
        const seenIds = new Set();
        const assets = definition.assets.map((entry, index) => {
          if (!entry || typeof entry.src !== "string" || !entry.src.trim()) {
            throw new Error(`Asset ${index + 1} is missing a source path.`);
          }
          const fileName = entry.src.split(/[\\/]/).pop();
          const id = String(entry.id || `manifest-asset-${index + 1}`).trim();
          if (!id || seenIds.has(id)) throw new Error(`Asset ${index + 1} has a missing or duplicate id.`);
          seenIds.add(id);
          const url = new URL(entry.src, manifestUrl).href;
          const extension = (fileName.match(/\.([a-z0-9]+)$/i)?.[1] || "unknown").toLowerCase();
          return {
            id,
            name: typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : deriveName(fileName),
            fileName,
            fileType: extension === "unknown" ? "unknown" : `image/${extension === "jpg" ? "jpeg" : extension}`,
            fileSize: null,
            lastModified: null,
            relativePath: entry.src,
            fileKey: `manifest::${url}`,
            url,
            revokeOnRelease: false,
            sourceKind: "manifest",
            metadata: normalizeManifestMetadata(entry)
          };
        });

        releaseAssets();
        state.assets = assets;
        state.loadedSet = {
          kind: "url-manifest",
          id: String(definition.id || "manifest-set"),
          name: String(definition.name || "Concept set"),
          sourcePath: typeof definition.sourcePath === "string" ? definition.sourcePath : null,
          manifestUrl: manifestUrl.href,
          catalogId: catalogEntry?.id || null,
          category: catalogEntry?.category || null,
          folder: catalogEntry?.folder || null,
          manifestPath: catalogEntry?.manifestPath || null
        };
        state.phase = "setup";
        state.runs = [];
        state.activeRunIndex = -1;
        state.calibration = null;
        state.reviewAssetId = null;
        state.annotationDraft = null;
        state.revealNames = false;
        state.telemetry = createTelemetrySession(sourceDescriptor());
        els.setName.value = state.loadedSet.name;
        setError();
        render();
      }

      function manifestUrlIsAllowed(url) {
        if (window.location.protocol === "file:") return url.protocol === "file:";
        return url.origin === window.location.origin;
      }

      function updateSetRoute(route) {
        if (!window.history?.replaceState) return;
        try {
          const url = new URL(window.location.href);
          if (route) url.searchParams.set("set", route);
          else url.searchParams.delete("set");
          window.history.replaceState(null, "", url.href);
        } catch {
          // The tournament remains usable when a local browser blocks history updates.
        }
      }

      function loadSetManifest(route, { updateUrl = false } = {}) {
        if (!route) return;
        let manifestUrl;
        try {
          manifestUrl = new URL(route, window.location.href);
        } catch {
          setError("The set route in the URL is invalid.");
          return;
        }
        if (!manifestUrlIsAllowed(manifestUrl)) {
          setError("The set route must be a local file or same-origin manifest.");
          return;
        }
        const catalogEntry = catalogEntryForManifestUrl(manifestUrl.href);
        if (catalogEntry?.status === "excluded" || catalogEntry?.status === "variant-kit") {
          updateSetRoute(null);
          setError(catalogEntry.status === "variant-kit"
            ? `${catalogEntry.name} is a production variant kit and does not require tournament review.`
            : `${catalogEntry.name} is excluded from the active art review queue.`);
          refreshTournamentOptions();
          renderBatchControls();
          return;
        }

        const loadToken = ++state.manifestLoadToken;
        els.tournamentSelect.disabled = true;
        setError("Loading selected tournament...");
        delete window[MANIFEST_GLOBAL];
        const script = document.createElement("script");
        script.src = manifestUrl.href;
        script.onload = () => {
          if (loadToken !== state.manifestLoadToken) {
            script.remove();
            return;
          }
          const definition = window[MANIFEST_GLOBAL];
          delete window[MANIFEST_GLOBAL];
          script.remove();
          try {
            loadSetDefinition(definition, manifestUrl.href);
            if (updateUrl) updateSetRoute(route);
            refreshTournamentOptions();
            renderBatchControls();
            window.scrollTo({ top: 0, behavior: "smooth" });
          } catch (error) {
            setError(`Could not load set manifest: ${error.message}`);
            renderSetup();
          }
        };
        script.onerror = () => {
          if (loadToken !== state.manifestLoadToken) return;
          script.remove();
          setError(`Could not load set manifest: ${manifestUrl.pathname}`);
          refreshTournamentOptions();
          renderBatchControls();
        };
        document.head.append(script);
      }

      function loadSetFromQuery() {
        if (!window.location || !window.location.search) return;
        const route = new URLSearchParams(window.location.search).get("set");
        if (route) loadSetManifest(route);
      }

      // Tournament engine
      function secureRandomIndex(maxExclusive) {
        if (maxExclusive <= 1) return 0;
        const range = 0x100000000;
        const limit = range - (range % maxExclusive);
        const value = new Uint32Array(1);
        do crypto.getRandomValues(value); while (value[0] >= limit);
        return value[0] % maxExclusive;
      }

      function shuffledCopy(values) {
        const copy = values.slice();
        for (let index = copy.length - 1; index > 0; index -= 1) {
          const swapIndex = secureRandomIndex(index + 1);
          [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
        }
        return copy;
      }

      function nextPowerOfTwo(value) {
        return 2 ** Math.ceil(Math.log2(Math.max(MIN_ASSETS, value)));
      }

      function openingPairsFromOrder(order) {
        const openingMatchCount = nextPowerOfTwo(order.length) / 2;
        const contestedMatchCount = order.length - openingMatchCount;
        const pairs = [];
        let cursor = 0;

        for (let index = 0; index < contestedMatchCount; index += 1) {
          pairs.push([order[cursor], order[cursor + 1]]);
          cursor += 2;
        }
        while (pairs.length < openingMatchCount) {
          pairs.push([order[cursor], null]);
          cursor += 1;
        }
        return pairs;
      }

      function openingPairSignature(order) {
        return openingPairsFromOrder(order).map(([leftId, rightId]) => (
          rightId ? [leftId, rightId].sort().join("+") : `${leftId}+BYE`
        )).sort().join("|");
      }

      function distinctSeedOrder(ids, previousOrder = null) {
        if (!previousOrder) return shuffledCopy(ids);
        const previousSequence = previousOrder.join("|");
        const previousPairs = openingPairSignature(previousOrder);

        for (let attempt = 0; attempt < 32; attempt += 1) {
          const candidate = shuffledCopy(ids);
          const sequenceChanged = candidate.join("|") !== previousSequence;
          const pairingsChanged = openingPairSignature(candidate) !== previousPairs;
          if (sequenceChanged && (ids.length === 2 || pairingsChanged)) return candidate;
        }

        if (ids.length === 2) return previousOrder.slice().reverse();
        const rotated = previousOrder.slice(1).concat(previousOrder[0]);
        if (openingPairSignature(rotated) !== previousPairs) return rotated;
        return previousOrder.slice().reverse();
      }

      function previousChoiceForPair(firstId, secondId) {
        for (let runIndex = state.runs.length - 1; runIndex >= 0; runIndex -= 1) {
          const history = state.runs[runIndex].history;
          for (let choiceIndex = history.length - 1; choiceIndex >= 0; choiceIndex -= 1) {
            const choice = history[choiceIndex];
            if (
              (choice.leftId === firstId && choice.rightId === secondId) ||
              (choice.leftId === secondId && choice.rightId === firstId)
            ) return choice;
          }
        }
        return null;
      }

      function sideExposure(assetId) {
        let left = 0;
        let right = 0;
        state.runs.forEach(run => run.history.forEach(choice => {
          if (choice.leftId === assetId) left += 1;
          if (choice.rightId === assetId) right += 1;
        }));
        return { left, right };
      }

      function orientPair(firstId, secondId) {
        if (!secondId) return [firstId, null];
        const previous = previousChoiceForPair(firstId, secondId);
        if (previous) return [previous.rightId, previous.leftId];

        const first = sideExposure(firstId);
        const second = sideExposure(secondId);
        const currentCost = Math.abs(first.left + 1 - first.right) + Math.abs(second.left - second.right - 1);
        const swappedCost = Math.abs(first.left - first.right - 1) + Math.abs(second.left + 1 - second.right);
        return swappedCost < currentCost ? [secondId, firstId] : [firstId, secondId];
      }

      function createMatch(leftId, rightId, roundIndex, matchIndex, prefix = "r") {
        const [orientedLeft, orientedRight] = orientPair(leftId, rightId);
        return {
          id: `${prefix}${roundIndex + 1}-m${matchIndex + 1}`,
          leftId: orientedLeft,
          rightId: orientedRight,
          winnerId: orientedRight ? null : orientedLeft,
          automaticBye: !orientedRight,
          presentedAtMs: null,
          presentationEventSequence: null
        };
      }

      function buildOpeningRound(seedOrder) {
        return {
          index: 0,
          matches: openingPairsFromOrder(seedOrder).map(([leftId, rightId], matchIndex) => (
            createMatch(leftId, rightId, 0, matchIndex)
          ))
        };
      }

      function buildRound(candidateIds, roundIndex) {
        const matches = [];
        for (let index = 0; index < candidateIds.length; index += 2) {
          matches.push(createMatch(
            candidateIds[index],
            candidateIds[index + 1] || null,
            roundIndex,
            matches.length
          ));
        }
        return { index: roundIndex, matches };
      }

      function createRun(runNumber, previousOrder = null) {
        const ids = state.assets.map(asset => asset.id);
        const seedOrder = distinctSeedOrder(ids, previousOrder);
        return {
          runNumber,
          seedOrder,
          rounds: [buildOpeningRound(seedOrder)],
          activeRoundIndex: 0,
          championId: null,
          history: [],
          startedAt: new Date().toISOString(),
          completedAt: null
        };
      }

      function activeRun() {
        if (state.calibration && (state.phase === "calibration" || state.phase === "results")) {
          return state.calibration;
        }
        return state.runs[state.activeRunIndex] || null;
      }

      function currentMatch(run = activeRun()) {
        if (!run) return null;
        const round = run.rounds[run.activeRoundIndex];
        return round ? round.matches.find(match => match.rightId && !match.winnerId) || null : null;
      }

      function recordAutomaticByes(run, round) {
        round.matches.filter(match => match.automaticBye).forEach(match => {
          recordEvent("automatic_bye", {
            runNumber: run.runNumber,
            roundNumber: round.index + 1,
            matchId: match.id,
            assetId: match.leftId
          });
        });
      }

      function recordRunStart(run) {
        recordEvent("run_started", {
          runNumber: run.runNumber,
          seedOrder: run.seedOrder.slice(),
          openingPairSignature: openingPairSignature(run.seedOrder)
        });
        recordAutomaticByes(run, run.rounds[0]);
      }

      function bracketPerformance() {
        return state.assets.map(asset => {
          const choices = state.runs.flatMap(run => run.history).filter(choice => (
            choice.leftId === asset.id || choice.rightId === asset.id
          ));
          return {
            assetId: asset.id,
            wins: choices.filter(choice => choice.winnerId === asset.id).length,
            losses: choices.filter(choice => choice.loserId === asset.id).length,
            championships: state.runs.filter(run => run.championId === asset.id).length
          };
        }).sort((a, b) => (
          b.championships - a.championships ||
          b.wins - a.wins ||
          a.losses - b.losses ||
          assetById(a.assetId).name.localeCompare(assetById(b.assetId).name)
        ));
      }

      function calibrationStandings(calibration = state.calibration) {
        if (!calibration) return [];
        const bracketRank = new Map(bracketPerformance().map((item, index) => [item.assetId, index]));
        return calibration.candidateIds.map(assetId => {
          const choices = calibration.history.filter(choice => choice.leftId === assetId || choice.rightId === assetId);
          return {
            assetId,
            wins: choices.filter(choice => choice.winnerId === assetId).length,
            losses: choices.filter(choice => choice.loserId === assetId).length,
            bracketRank: bracketRank.get(assetId)
          };
        }).sort((a, b) => b.wins - a.wins || a.losses - b.losses || a.bracketRank - b.bracketRank);
      }

      function createCalibration() {
        const candidateIds = bracketPerformance().slice(0, Math.min(4, state.assets.length)).map(item => item.assetId);
        const matches = [];
        for (let leftIndex = 0; leftIndex < candidateIds.length; leftIndex += 1) {
          for (let rightIndex = leftIndex + 1; rightIndex < candidateIds.length; rightIndex += 1) {
            matches.push(createMatch(
              candidateIds[leftIndex],
              candidateIds[rightIndex],
              0,
              matches.length,
              "c"
            ));
          }
        }
        return {
          isCalibration: true,
          runNumber: 3,
          seedOrder: candidateIds.slice(),
          candidateIds,
          rounds: [{ index: 0, matches }],
          activeRoundIndex: 0,
          championId: null,
          history: [],
          startedAt: new Date().toISOString(),
          completedAt: null
        };
      }

      function startCalibration() {
        state.calibration = createCalibration();
        state.revealNames = false;
        state.phase = "calibration";
        recordEvent("calibration_started", {
          candidateIds: state.calibration.candidateIds.slice(),
          comparisonCount: state.calibration.rounds[0].matches.length
        });
      }

      function advanceRun(run) {
        const round = run.rounds[run.activeRoundIndex];
        if (!round || round.matches.some(match => !match.winnerId)) return;

        if (run.isCalibration) {
          const leader = calibrationStandings(run)[0];
          run.championId = leader?.assetId || null;
          run.completedAt = new Date().toISOString();
          state.telemetry.completedAt = run.completedAt;
          recordEvent("calibration_completed", {
            leaderId: run.championId,
            standings: calibrationStandings(run)
          });
          state.phase = "results";
          persistCurrentAttempt();
          announce(`${assetById(run.championId).name} led the calibration comparisons.`);
          return;
        }

        const winners = round.matches.map(match => match.winnerId);
        if (winners.length === 1) {
          run.championId = winners[0];
          run.completedAt = new Date().toISOString();
          recordEvent("run_completed", {
            runNumber: run.runNumber,
            championId: run.championId,
            decisionCount: run.history.length
          });
          if (run.runNumber === 1) {
            state.phase = "between";
            announce(`${assetById(run.championId).name} won run 1.`);
          } else {
            startCalibration();
            announce(`${assetById(run.championId).name} won run 2. Calibration comparisons are ready.`);
          }
          return;
        }

        run.activeRoundIndex += 1;
        const nextRound = buildRound(winners, run.activeRoundIndex);
        run.rounds.push(nextRound);
        recordAutomaticByes(run, nextRound);
      }

      function choose(side) {
        if (state.phase !== "play" && state.phase !== "calibration") return;
        const run = activeRun();
        const match = currentMatch(run);
        if (!match) return;
        const winnerId = side === "left" ? match.leftId : match.rightId;
        const loserId = side === "left" ? match.rightId : match.leftId;
        const selectedAtMs = Date.now();
        const decisionMs = Math.max(0, selectedAtMs - (match.presentedAtMs || selectedAtMs));
        const choiceEvent = recordEvent("choice", {
          stage: run.isCalibration ? "calibration" : "bracket",
          runNumber: run.runNumber,
          roundNumber: run.activeRoundIndex + 1,
          matchId: match.id,
          leftId: match.leftId,
          rightId: match.rightId,
          selectedSide: side,
          winnerId,
          loserId,
          decisionMs,
          namesVisible: state.revealNames,
          presentationEventSequence: match.presentationEventSequence,
          undone: false
        });
        match.winnerId = winnerId;
        run.history.push({
          roundIndex: run.activeRoundIndex,
          matchId: match.id,
          leftId: match.leftId,
          rightId: match.rightId,
          winnerId,
          loserId,
          selectedSide: side,
          decisionMs,
          namesVisible: state.revealNames,
          selectedAt: choiceEvent.at,
          telemetryEventSequence: choiceEvent.sequence
        });
        announce(`${state.revealNames ? assetById(winnerId).name : anonymousName(winnerId, run)} selected.`);
        advanceRun(run);
        render();
      }

      function undoLastChoice() {
        const wasResults = state.phase === "results";
        if (wasResults) saveReviewNotes();
        const run = activeRun();
        if (!run || !run.history.length) return;
        const last = run.history.pop();
        const choiceEvent = state.telemetry.events.find(event => event.sequence === last.telemetryEventSequence);
        if (choiceEvent) {
          choiceEvent.undone = true;
          choiceEvent.undoneAt = new Date().toISOString();
        }
        const completionEvent = [...state.telemetry.events].reverse().find(event => (
          (event.type === "run_completed" || event.type === "calibration_completed") &&
          (event.runNumber === run.runNumber || run.isCalibration) &&
          !event.undone
        ));
        if (completionEvent) completionEvent.undone = true;
        recordEvent("undo", {
          runNumber: run.runNumber,
          roundNumber: last.roundIndex + 1,
          matchId: last.matchId,
          choiceEventSequence: last.telemetryEventSequence,
          previousWinnerId: last.winnerId
        });
        run.rounds = run.rounds.slice(0, last.roundIndex + 1);
        run.activeRoundIndex = last.roundIndex;
        const match = run.rounds[last.roundIndex].matches.find(item => item.id === last.matchId);
        if (match) {
          match.winnerId = null;
          match.presentedAtMs = null;
          match.presentationEventSequence = null;
        }
        run.championId = null;
        run.completedAt = null;
        state.telemetry.completedAt = null;
        state.phase = run.isCalibration ? "calibration" : "play";
        if (wasResults) removePersistedCurrentAttempt();
        announce("Last choice undone.");
        render();
      }

      function startFirstRun() {
        if (state.assets.length < MIN_ASSETS || state.assets.length > MAX_ASSETS) return;
        state.assets.forEach(asset => { asset.name = asset.name.trim() || deriveName(asset.fileName); });
        resetTelemetry();
        state.calibration = null;
        state.runs = [createRun(1)];
        state.activeRunIndex = 0;
        state.revealNames = false;
        state.phase = "play";
        recordEvent("tournament_started", {
          decisionName: els.setName.value.trim() || null,
          assetIds: state.assets.map(asset => asset.id),
          runCount: 2
        });
        recordRunStart(state.runs[0]);
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      function startSecondRun() {
        const firstOrder = state.runs[0].seedOrder;
        state.runs.push(createRun(2, firstOrder));
        state.activeRunIndex = 1;
        state.revealNames = false;
        state.phase = "play";
        recordRunStart(state.runs[1]);
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      function rerunSameSet() {
        saveReviewNotes();
        resetTelemetry();
        state.calibration = null;
        state.runs = [createRun(1)];
        state.activeRunIndex = 0;
        state.reviewAssetId = null;
        state.annotationDraft = null;
        state.revealNames = false;
        state.phase = "play";
        recordEvent("tournament_started", {
          decisionName: els.setName.value.trim() || null,
          assetIds: state.assets.map(asset => asset.id),
          runCount: 2
        });
        recordRunStart(state.runs[0]);
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      function anonymousName(id, run = activeRun()) {
        const seed = run ? run.seedOrder.indexOf(id) + 1 : 0;
        return seed > 0 ? `Concept ${String(seed).padStart(2, "0")}` : "Concept";
      }

      function announce(message) {
        els.announcer.textContent = "";
        window.setTimeout(() => { els.announcer.textContent = message; }, 20);
      }

      function setScreen(visibleScreen) {
        [els.setupScreen, els.playScreen, els.betweenScreen, els.resultsScreen].forEach(screen => {
          screen.hidden = screen !== visibleScreen;
        });
      }

      // Primary screen rendering
      function renderSetup() {
        const count = state.assets.length;
        els.assetCount.textContent = `${count} / ${MAX_ASSETS} loaded`;
        els.assetEmpty.hidden = count > 0;
        els.assetList.hidden = count === 0;
        els.startButton.disabled = count < MIN_ASSETS || count > MAX_ASSETS;
        els.startButton.textContent = count >= MIN_ASSETS ? "Start review →" : "Select a tournament";
        els.reviewReadyName.textContent = state.loadedSet?.name || (count ? els.setName.value.trim() || "Concept set" : "Select a tournament above");
        els.loadedSource.hidden = !state.loadedSet;
        els.loadedSource.textContent = state.loadedSet
          ? `Loaded set route: ${state.loadedSet.sourcePath || state.loadedSet.manifestUrl}`
          : "";

        if (count >= MIN_ASSETS) {
          const calibrationCount = Math.min(4, count);
          const calibrationVotes = calibrationCount * (calibrationCount - 1) / 2;
          els.comparisonEstimate.textContent = `${count} concepts · two randomized brackets · ${calibrationVotes} finalist calibration choices`;
        } else {
          els.comparisonEstimate.textContent = "Choose a tournament to begin.";
        }

        const fragment = document.createDocumentFragment();
        state.assets.forEach((asset, index) => {
          const item = document.createElement("article");
          item.className = "asset-item";

          const thumb = document.createElement("div");
          thumb.className = "asset-thumb";
          const image = document.createElement("img");
          image.src = asset.url;
          image.alt = "";
          image.loading = "lazy";
          image.draggable = false;
          thumb.append(image);

          const input = document.createElement("input");
          input.className = "asset-name";
          input.type = "text";
          input.maxLength = 100;
          input.value = asset.name;
          input.setAttribute("aria-label", `Name for concept ${index + 1}`);
          input.addEventListener("input", () => { asset.name = input.value; });
          input.addEventListener("blur", () => {
            asset.name = input.value.trim() || deriveName(asset.fileName);
            input.value = asset.name;
          });

          const filename = document.createElement("span");
          filename.className = "asset-file";
          filename.textContent = asset.relativePath || asset.fileName;
          filename.title = asset.relativePath || asset.fileName;

          const remove = document.createElement("button");
          remove.className = "remove-asset";
          remove.type = "button";
          remove.textContent = "×";
          remove.setAttribute("aria-label", `Remove ${asset.name}`);
          remove.addEventListener("click", () => removeAsset(asset.id));

          item.append(thumb, input, filename, remove);
          fragment.append(item);
        });
        els.assetList.replaceChildren(fragment);
      }

      function roundName(roundIndex, assetCount = state.assets.length) {
        const totalRounds = Math.ceil(Math.log2(assetCount));
        if (roundIndex === totalRounds - 1) return "Final";
        if (roundIndex === totalRounds - 2) return "Semifinal";
        return `Round ${roundIndex + 1}`;
      }

      function visibleName(id, run) {
        const asset = assetById(id);
        if (!asset) return "Unknown concept";
        return state.revealNames ? asset.name : anonymousName(id, run);
      }

      function renderPlay() {
        const run = activeRun();
        const match = currentMatch(run);
        if (!run || !match) return;
        if (match.presentedAtMs === null) {
          match.presentedAtMs = Date.now();
          const presentationEvent = recordEvent("match_presented", {
            stage: run.isCalibration ? "calibration" : "bracket",
            runNumber: run.runNumber,
            roundNumber: run.activeRoundIndex + 1,
            matchId: match.id,
            leftId: match.leftId,
            rightId: match.rightId,
            namesVisible: state.revealNames
          });
          match.presentationEventSequence = presentationEvent.sequence;
        }
        const left = assetById(match.leftId);
        const right = assetById(match.rightId);
        const totalVotes = run.isCalibration ? run.rounds[0].matches.length : state.assets.length - 1;
        const completedVotes = run.history.length;

        els.matchTitle.textContent = state.loadedSet?.name || els.setName.value.trim() || "Concept review";
        els.runLabel.textContent = run.isCalibration ? "Final calibration" : `Run ${run.runNumber} of 2`;
        els.roundLabel.textContent = run.isCalibration
          ? `Top-${run.candidateIds.length} round robin · comparison ${run.rounds[0].matches.indexOf(match) + 1}`
          : `${roundName(run.activeRoundIndex)} · matchup ${run.rounds[run.activeRoundIndex].matches.indexOf(match) + 1}`;
        els.progressLabel.textContent = `${completedVotes} / ${totalVotes} decisions`;
        els.progressBar.style.width = `${totalVotes ? (completedVotes / totalVotes) * 100 : 0}%`;
        els.toggleNames.textContent = state.revealNames ? "Hide names" : "Reveal names";
        els.toggleNames.setAttribute("aria-pressed", String(state.revealNames));
        els.undoButton.disabled = run.history.length === 0;
        els.telemetrySession.textContent = `Session ${state.telemetry.sessionId}`;
        els.telemetryDecisions.textContent = `${validChoiceEvents().length} recorded decision${validChoiceEvents().length === 1 ? "" : "s"}`;

        els.leftImage.src = left.url;
        els.rightImage.src = right.url;
        els.leftImage.alt = state.revealNames ? left.name : "Left concept";
        els.rightImage.alt = state.revealNames ? right.name : "Right concept";
        els.leftName.textContent = visibleName(left.id, run);
        els.rightName.textContent = visibleName(right.id, run);
        els.candidateLeft.setAttribute("aria-label", `Choose ${state.revealNames ? left.name : "left concept"}`);
        els.candidateRight.setAttribute("aria-label", `Choose ${state.revealNames ? right.name : "right concept"}`);

        if (run.isCalibration) {
          els.bracketTitle.textContent = "Calibration comparisons";
          els.bracketNote.textContent = "Every top-four pair is compared once; repeated bracket pairings are mirrored.";
          renderCalibration(run, match);
        } else {
          els.bracketTitle.textContent = "Live bracket";
          els.bracketNote.textContent = "Automatic byes occur only in the opening round and do not require a vote.";
          renderBracket(run, match);
        }
      }

      function createBracketEntry(id, winnerId, run, options = {}) {
        const entry = document.createElement("div");
        entry.className = "bracket-entry";

        if (!id) {
          entry.classList.add("is-empty");
          entry.textContent = options.bye ? "Automatic bye" : "Awaiting winner";
          return entry;
        }

        if (winnerId === id) entry.classList.add("is-winner");
        const seed = document.createElement("span");
        seed.className = "entry-seed";
        seed.textContent = String(run.seedOrder.indexOf(id) + 1).padStart(2, "0");
        const name = document.createElement("span");
        name.className = "entry-name";
        name.textContent = visibleName(id, run);
        entry.append(seed, name);

        if (winnerId === id) {
          const marker = document.createElement("span");
          marker.className = "entry-winner";
          marker.textContent = options.bye ? "BYE" : "WIN";
          entry.append(marker);
        }
        return entry;
      }

      function renderBracket(run, activeMatch) {
        const fragment = document.createDocumentFragment();
        const totalRounds = Math.ceil(Math.log2(state.assets.length));
        let candidateCount = nextPowerOfTwo(state.assets.length);

        for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
          const column = document.createElement("section");
          column.className = "round-column";
          const heading = document.createElement("div");
          heading.className = "round-title";
          const roundMatchCount = Math.ceil(candidateCount / 2);
          heading.innerHTML = `<span>${roundName(roundIndex)}</span><span>${roundMatchCount} ${roundMatchCount === 1 ? "match" : "matches"}</span>`;

          const matches = document.createElement("div");
          matches.className = "round-matches";
          const round = run.rounds[roundIndex];

          for (let matchIndex = 0; matchIndex < roundMatchCount; matchIndex += 1) {
            const match = round ? round.matches[matchIndex] : null;
            const card = document.createElement("div");
            card.className = "bracket-match";
            if (match && activeMatch && match.id === activeMatch.id && roundIndex === run.activeRoundIndex) {
              card.classList.add("is-current");
            }

            if (match) {
              card.append(
                createBracketEntry(match.leftId, match.winnerId, run, { bye: match.automaticBye }),
                createBracketEntry(match.rightId, match.winnerId, run, { bye: match.automaticBye })
              );
            } else {
              card.append(
                createBracketEntry(null, null, run),
                createBracketEntry(null, null, run)
              );
            }
            matches.append(card);
          }

          column.append(heading, matches);
          fragment.append(column);
          candidateCount = roundMatchCount;
        }

        els.bracket.replaceChildren(fragment);
      }

      function renderCalibration(run, activeMatch) {
        const column = document.createElement("section");
        column.className = "round-column";
        const heading = document.createElement("div");
        heading.className = "round-title";
        heading.innerHTML = `<span>Top-${run.candidateIds.length} round robin</span><span>${run.rounds[0].matches.length} comparisons</span>`;
        const matches = document.createElement("div");
        matches.className = "round-matches";

        run.rounds[0].matches.forEach(match => {
          const card = document.createElement("div");
          card.className = "bracket-match";
          if (activeMatch && match.id === activeMatch.id) card.classList.add("is-current");
          card.append(
            createBracketEntry(match.leftId, match.winnerId, run),
            createBracketEntry(match.rightId, match.winnerId, run)
          );
          matches.append(card);
        });

        column.append(heading, matches);
        els.bracket.replaceChildren(column);
      }

      function renderBetween() {
        const champion = assetById(state.runs[0].championId);
        els.betweenTitle.textContent = champion.name;
        els.firstChampionImage.src = champion.url;
        els.firstChampionImage.alt = `${champion.name}, run 1 champion`;
      }

      function validChoiceEvents() {
        return state.telemetry.events.filter(event => event.type === "choice" && !event.undone);
      }

      function mean(values) {
        return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
      }

      function median(values) {
        if (!values.length) return null;
        const sorted = values.slice().sort((a, b) => a - b);
        const midpoint = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[midpoint] : (sorted[midpoint - 1] + sorted[midpoint]) / 2;
      }

      function ratio(numerator, denominator) {
        return denominator ? Number((numerator / denominator).toFixed(4)) : null;
      }

      function tagsForAsset(id) {
        return assetById(id)?.metadata?.tags || [];
      }

      function buildTelemetrySummary() {
        const choices = validChoiceEvents();
        const allChoiceEvents = state.telemetry.events.filter(event => event.type === "choice");
        const decisionTimes = choices.map(event => event.decisionMs);
        const leftSelections = choices.filter(event => event.selectedSide === "left").length;
        const rightSelections = choices.length - leftSelections;
        const pairMap = new Map();

        choices.forEach(event => {
          const assetIds = [event.leftId, event.rightId].sort();
          const key = assetIds.join("::");
          if (!pairMap.has(key)) pairMap.set(key, { pairKey: key, assetIds, decisions: [] });
          pairMap.get(key).decisions.push({
            stage: event.stage || "bracket",
            runNumber: event.runNumber,
            roundNumber: event.roundNumber,
            matchId: event.matchId,
            leftId: event.leftId,
            rightId: event.rightId,
            winnerId: event.winnerId,
            loserId: event.loserId,
            selectedSide: event.selectedSide,
            decisionMs: event.decisionMs,
            namesVisible: event.namesVisible
          });
        });

        const pairResults = [...pairMap.values()].map(pair => {
          const winnerIds = [...new Set(pair.decisions.map(decision => decision.winnerId))];
          return {
            ...pair,
            comparisonCount: pair.decisions.length,
            agreement: pair.decisions.length > 1 ? winnerIds.length === 1 : null,
            consistentWinnerId: winnerIds.length === 1 ? winnerIds[0] : null
          };
        });
        const repeatedPairs = pairResults.filter(pair => pair.comparisonCount > 1);
        const repeatedPairAgreements = repeatedPairs.filter(pair => pair.agreement);

        const perAsset = state.assets.map(asset => {
          const appearances = choices.filter(event => event.leftId === asset.id || event.rightId === asset.id);
          const wins = appearances.filter(event => event.winnerId === asset.id).length;
          const relevantTimes = appearances.map(event => event.decisionMs);
          return {
            assetId: asset.id,
            name: asset.name,
            tags: asset.metadata?.tags || [],
            appearances: appearances.length,
            wins,
            losses: appearances.length - wins,
            winRate: ratio(wins, appearances.length),
            selectedFromLeft: appearances.filter(event => event.winnerId === asset.id && event.selectedSide === "left").length,
            selectedFromRight: appearances.filter(event => event.winnerId === asset.id && event.selectedSide === "right").length,
            meanDecisionMs: mean(relevantTimes),
            medianDecisionMs: median(relevantTimes),
            championships: state.runs.filter(run => run.championId === asset.id).length
          };
        }).sort((a, b) => b.wins - a.wins || b.appearances - a.appearances || a.name.localeCompare(b.name));

        const tagMap = new Map();
        const ensureTag = tag => {
          if (!tagMap.has(tag)) {
            tagMap.set(tag, { tag, selectedOverAlternative: 0, rejectedAgainstAlternative: 0 });
          }
          return tagMap.get(tag);
        };
        choices.forEach(event => {
          const winnerTags = new Set(tagsForAsset(event.winnerId));
          const loserTags = new Set(tagsForAsset(event.loserId));
          winnerTags.forEach(tag => {
            if (!loserTags.has(tag)) ensureTag(tag).selectedOverAlternative += 1;
          });
          loserTags.forEach(tag => {
            if (!winnerTags.has(tag)) ensureTag(tag).rejectedAgainstAlternative += 1;
          });
        });
        const tagSignals = [...tagMap.values()].map(item => {
          const decisiveComparisons = item.selectedOverAlternative + item.rejectedAgainstAlternative;
          return {
            ...item,
            decisiveComparisons,
            netPreference: item.selectedOverAlternative - item.rejectedAgainstAlternative,
            selectionRate: ratio(item.selectedOverAlternative, decisiveComparisons)
          };
        }).sort((a, b) => b.netPreference - a.netPreference || b.decisiveComparisons - a.decisiveComparisons || a.tag.localeCompare(b.tag));

        return {
          recordedDecisionCount: choices.length,
          totalChoiceEventCount: allChoiceEvents.length,
          undoneChoiceCount: allChoiceEvents.filter(event => event.undone).length,
          undoEventCount: state.telemetry.events.filter(event => event.type === "undo").length,
          namesVisibleDecisionCount: choices.filter(event => event.namesVisible).length,
          nameRevealToggleCount: state.telemetry.events.filter(event => event.type === "names_revealed" || event.type === "names_hidden").length,
          automaticByeCount: state.telemetry.events.filter(event => event.type === "automatic_bye").length,
          leftSelections,
          rightSelections,
          leftSelectionRate: ratio(leftSelections, choices.length),
          rightSelectionRate: ratio(rightSelections, choices.length),
          meanDecisionMs: mean(decisionTimes),
          medianDecisionMs: median(decisionTimes),
          repeatedPairCount: repeatedPairs.length,
          repeatedPairAgreementCount: repeatedPairAgreements.length,
          repeatedPairAgreementRate: ratio(repeatedPairAgreements.length, repeatedPairs.length),
          perAsset,
          tagSignals,
          pairResults
        };
      }

      // Final visual review and structured art direction
      function annotationKindLabel(kind) {
        return ({ keep: "Keep", change: "Change", avoid: "Avoid" })[kind] || "Direction";
      }

      function annotationCategoryLabel(category) {
        return ANNOTATION_CATEGORY_LABELS[category] || ANNOTATION_CATEGORY_LABELS.other;
      }

      function currentReviewRecord() {
        return batchRecordForEntry(currentCatalogEntry());
      }

      function annotationsForAsset(assetId) {
        return normalizeAnnotations(currentReviewRecord()?.annotations).filter(annotation => annotation.assetId === assetId);
      }

      function conceptDirectionState(assetId) {
        const kinds = [...new Set(annotationsForAsset(assetId).map(annotation => annotation.kind))];
        if (!kinds.length) return null;
        return kinds.length === 1 ? kinds[0] : "mixed";
      }

      function ensureReviewAssetId() {
        if (assetById(state.reviewAssetId)) return state.reviewAssetId;
        const lockedId = currentReviewRecord()?.lock?.asset?.id;
        state.reviewAssetId = assetById(lockedId)
          ? lockedId
          : state.calibration?.championId || state.runs[1]?.championId || state.assets[0]?.id || null;
        return state.reviewAssetId;
      }

      function conceptResultBadges(assetId) {
        const badges = [];
        if (state.runs[0]?.championId === assetId) badges.push({ label: "Run 1 winner", leader: true });
        if (state.runs[1]?.championId === assetId) badges.push({ label: "Run 2 winner", leader: true });
        const standings = calibrationStandings();
        const standingIndex = standings.findIndex(item => item.assetId === assetId);
        if (standingIndex >= 0) {
          const standing = standings[standingIndex];
          badges.push({
            label: `Calibration #${standingIndex + 1} \u00b7 ${standing.wins}-${standing.losses}`,
            leader: standingIndex === 0
          });
        }
        return badges;
      }

      function renderAnnotationWorkspace() {
        if (state.phase !== "results") return;
        const selectedId = ensureReviewAssetId();
        const asset = assetById(selectedId);
        const entry = currentCatalogEntry();
        const record = currentReviewRecord();
        const allAnnotations = normalizeAnnotations(record?.annotations);
        const selectedAnnotations = allAnnotations.filter(annotation => annotation.assetId === selectedId);
        const enabled = Boolean(entry && asset);

        if (!ANNOTATION_KINDS.has(els.annotationKind.value)) els.annotationKind.value = "keep";
        if (!Object.prototype.hasOwnProperty.call(ANNOTATION_CATEGORY_LABELS, els.annotationCategory.value)) {
          els.annotationCategory.value = "overall-form";
        }
        els.annotationKind.disabled = !enabled;
        els.annotationCategory.disabled = !enabled;
        els.annotationNote.disabled = !enabled;
        els.annotationWhole.disabled = !enabled;
        els.annotationSurface.classList.toggle("is-disabled", !enabled);
        els.annotationSurface.setAttribute("aria-disabled", String(!enabled));
        els.annotationConceptName.textContent = asset?.name || "Select a concept";
        els.annotationImage.src = asset?.url || "";
        els.annotationImage.alt = asset ? `${asset.name}, selected for detailed art-direction review` : "Selected concept for detailed review";

        els.annotationOverlay.textContent = "";
        selectedAnnotations.forEach((annotation, index) => {
          const region = document.createElement("div");
          region.className = `annotation-region is-${annotation.kind}`;
          region.style.left = `${annotation.region.x}%`;
          region.style.top = `${annotation.region.y}%`;
          region.style.width = `${annotation.region.width}%`;
          region.style.height = `${annotation.region.height}%`;
          region.setAttribute("data-label", `${index + 1} ${annotationKindLabel(annotation.kind)}`);
          els.annotationOverlay.append(region);
        });

        els.annotationList.textContent = "";
        selectedAnnotations.forEach((annotation, index) => {
          const item = document.createElement("article");
          item.className = "annotation-item";

          const marker = document.createElement("span");
          marker.className = `annotation-index is-${annotation.kind}`;
          marker.textContent = String(index + 1).padStart(2, "0");

          const copy = document.createElement("div");
          copy.className = "annotation-item-copy";
          const title = document.createElement("strong");
          title.textContent = `${annotationKindLabel(annotation.kind)} \u00b7 ${annotationCategoryLabel(annotation.category)}`;
          const note = document.createElement("p");
          note.textContent = annotation.note || "No additional note.";
          copy.append(title, note);

          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "annotation-delete";
          remove.textContent = "\u00d7";
          remove.setAttribute("aria-label", `Delete mark ${index + 1} from ${asset?.name || "this concept"}`);
          remove.addEventListener("click", () => removeReviewAnnotation(annotation.id));
          item.append(marker, copy, remove);
          els.annotationList.append(item);
        });

        els.annotationEmpty.hidden = selectedAnnotations.length > 0;
        els.annotationCount.textContent = `${selectedAnnotations.length} mark${selectedAnnotations.length === 1 ? "" : "s"}`;
        const summary = buildAnnotationSummary(allAnnotations);
        if (!summary.total) {
          els.annotationSummary.textContent = enabled
            ? "No structured direction recorded yet. Mark exact regions so the next concept batch can preserve good parts without repeating weak ones."
            : "Structured annotations are available for catalog-backed art reviews.";
        } else {
          const counts = [
            summary.counts.keep ? `${summary.counts.keep} keep` : null,
            summary.counts.change ? `${summary.counts.change} change` : null,
            summary.counts.avoid ? `${summary.counts.avoid} avoid` : null
          ].filter(Boolean).join(" \u00b7 ");
          const categories = Object.entries(summary.categoryCounts)
            .sort((left, right) => right[1] - left[1])
            .slice(0, 3)
            .map(([category, count]) => `${annotationCategoryLabel(category)} (${count})`)
            .join(", ");
          els.annotationSummary.textContent = `${counts} across ${summary.annotatedAssetIds.length} concept${summary.annotatedAssetIds.length === 1 ? "" : "s"}. Focus areas: ${categories}.`;
        }
      }

      function renderReviewBoard() {
        if (state.phase !== "results") return;
        const selectedId = ensureReviewAssetId();
        els.conceptContactSheet.textContent = "";
        state.assets.forEach((asset, index) => {
          const card = document.createElement("button");
          card.type = "button";
          card.className = "concept-card";
          card.classList.toggle("is-selected", asset.id === selectedId);
          const directionState = conceptDirectionState(asset.id);
          if (directionState) card.classList.add(`has-direction-${directionState}`);
          card.setAttribute("aria-pressed", String(asset.id === selectedId));
          card.setAttribute("aria-label", `Inspect ${asset.name}`);

          const imageFrame = document.createElement("span");
          imageFrame.className = "concept-card-image";
          const image = document.createElement("img");
          image.src = asset.url;
          image.alt = "";
          imageFrame.append(image);

          const meta = document.createElement("span");
          meta.className = "concept-card-meta";
          const title = document.createElement("span");
          title.className = "concept-card-title";
          const number = document.createElement("span");
          number.textContent = String(index + 1).padStart(2, "0");
          const name = document.createElement("strong");
          name.textContent = asset.name;
          title.append(number, name);

          const foot = document.createElement("span");
          foot.className = "concept-card-foot";
          const badges = document.createElement("span");
          badges.className = "concept-card-badges";
          if (directionState) {
            const directionBadge = document.createElement("span");
            directionBadge.className = `concept-badge is-direction is-${directionState}`;
            directionBadge.textContent = directionState === "mixed" ? "Mixed" : annotationKindLabel(directionState);
            badges.append(directionBadge);
          }
          conceptResultBadges(asset.id).forEach(item => {
            const badge = document.createElement("span");
            badge.className = "concept-badge";
            badge.classList.toggle("is-leader", item.leader);
            badge.textContent = item.label;
            badges.append(badge);
          });
          const marks = annotationsForAsset(asset.id).length;
          const markCount = document.createElement("span");
          markCount.className = "concept-mark-count";
          markCount.textContent = marks ? `${marks} mark${marks === 1 ? "" : "s"}` : "";
          foot.append(badges, markCount);
          meta.append(title, foot);
          card.append(imageFrame, meta);
          card.addEventListener("click", () => selectReviewAsset(asset.id, { focusWorkspace: true }));
          els.conceptContactSheet.append(card);
        });
        renderAnnotationWorkspace();
      }

      function selectReviewAsset(assetId, { focusWorkspace = false } = {}) {
        if (!assetById(assetId)) return;
        state.reviewAssetId = assetId;
        if ([...els.lockCandidate.options].some(option => option.value === assetId)) {
          els.lockCandidate.value = assetId;
        }
        renderConceptIntent();
        renderReviewBoard();
        if (focusWorkspace) els.annotationSurface.scrollIntoView?.({ block: "center", behavior: "smooth" });
      }

      function annotationPoint(event) {
        const bounds = els.annotationSurface.getBoundingClientRect?.();
        if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;
        const clientX = Number(event.clientX);
        const clientY = Number(event.clientY);
        if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
        return {
          x: clamp(((clientX - bounds.left) / bounds.width) * 100, 0, 100),
          y: clamp(((clientY - bounds.top) / bounds.height) * 100, 0, 100)
        };
      }

      function draftRegion() {
        const draft = state.annotationDraft;
        if (!draft) return null;
        return {
          x: Math.min(draft.start.x, draft.end.x),
          y: Math.min(draft.start.y, draft.end.y),
          width: Math.abs(draft.end.x - draft.start.x),
          height: Math.abs(draft.end.y - draft.start.y)
        };
      }

      function renderAnnotationDraft() {
        const region = draftRegion();
        els.annotationDraft.hidden = !region;
        if (!region) return;
        els.annotationDraft.style.left = `${region.x}%`;
        els.annotationDraft.style.top = `${region.y}%`;
        els.annotationDraft.style.width = `${region.width}%`;
        els.annotationDraft.style.height = `${region.height}%`;
      }

      function startAnnotation(event) {
        if (state.phase !== "results" || !currentCatalogEntry() || !assetById(ensureReviewAssetId())) return;
        if (event.button !== undefined && event.button !== 0) return;
        const point = annotationPoint(event);
        if (!point) return;
        event.preventDefault?.();
        state.annotationDraft = { pointerId: event.pointerId, start: point, end: point };
        els.annotationSurface.setPointerCapture?.(event.pointerId);
        renderAnnotationDraft();
      }

      function moveAnnotation(event) {
        const draft = state.annotationDraft;
        if (!draft || (draft.pointerId !== undefined && event.pointerId !== draft.pointerId)) return;
        const point = annotationPoint(event);
        if (!point) return;
        event.preventDefault?.();
        draft.end = point;
        renderAnnotationDraft();
      }

      function addReviewAnnotation(region) {
        const entry = currentCatalogEntry();
        const asset = assetById(ensureReviewAssetId());
        if (!entry || !asset) return;
        const record = ensureBatchRecord(entry);
        const annotation = normalizeAnnotation({
          id: createSessionId().replace(/^ct-/, "mark-"),
          assetId: asset.id,
          kind: ANNOTATION_KINDS.has(els.annotationKind.value) ? els.annotationKind.value : "keep",
          category: Object.prototype.hasOwnProperty.call(ANNOTATION_CATEGORY_LABELS, els.annotationCategory.value)
            ? els.annotationCategory.value
            : "overall-form",
          note: els.annotationNote.value,
          region,
          createdAt: new Date().toISOString()
        });
        if (!annotation) return;
        record.annotations = [...normalizeAnnotations(record.annotations), annotation];
        record.annotationSummary = buildAnnotationSummary(record.annotations);
        record.reviewConfirmedAt = null;
        recordEvent("review_annotation_added", {
          catalogId: entry.id,
          annotationId: annotation.id,
          assetId: annotation.assetId,
          kind: annotation.kind,
          category: annotation.category,
          region: annotation.region
        });
        persistCurrentAttempt(record);
        els.annotationNote.value = "";
        renderReviewBoard();
        renderReviewControls();
        announce(`${annotationKindLabel(annotation.kind)} mark added to ${asset.name}.`);
      }

      function finishAnnotation(event) {
        const draft = state.annotationDraft;
        if (!draft || (draft.pointerId !== undefined && event.pointerId !== draft.pointerId)) return;
        const point = annotationPoint(event);
        if (point) draft.end = point;
        let region = draftRegion();
        state.annotationDraft = null;
        els.annotationSurface.releasePointerCapture?.(event.pointerId);
        renderAnnotationDraft();
        if (!region) return;
        if (region.width < 1.5 && region.height < 1.5) {
          region = {
            x: clamp(draft.start.x - 2, 0, 96),
            y: clamp(draft.start.y - 2, 0, 96),
            width: 4,
            height: 4
          };
        } else {
          region.width = Math.max(region.width, .5);
          region.height = Math.max(region.height, .5);
        }
        addReviewAnnotation(region);
      }

      function cancelAnnotation(event) {
        if (!state.annotationDraft) return;
        state.annotationDraft = null;
        els.annotationSurface.releasePointerCapture?.(event.pointerId);
        renderAnnotationDraft();
      }

      function markWholeConcept() {
        addReviewAnnotation({ x: .5, y: .5, width: 99, height: 99 });
      }

      function removeReviewAnnotation(annotationId) {
        const entry = currentCatalogEntry();
        const record = batchRecordForEntry(entry);
        if (!entry || !record) return;
        const annotations = normalizeAnnotations(record.annotations);
        const removed = annotations.find(annotation => annotation.id === annotationId);
        if (!removed) return;
        record.annotations = annotations.filter(annotation => annotation.id !== annotationId);
        record.annotationSummary = buildAnnotationSummary(record.annotations);
        record.reviewConfirmedAt = null;
        recordEvent("review_annotation_removed", {
          catalogId: entry.id,
          annotationId,
          assetId: removed.assetId,
          kind: removed.kind,
          category: removed.category
        });
        persistCurrentAttempt(record);
        renderReviewBoard();
        renderReviewControls();
        announce(`Removed a ${annotationKindLabel(removed.kind).toLowerCase()} mark.`);
      }

      function renderResults() {
        const first = assetById(state.runs[0].championId);
        const second = assetById(state.runs[1].championId);
        const calibrationLeader = assetById(state.calibration?.championId);
        const bracketAgreement = first.id === second.id;
        const fullAgreement = bracketAgreement && calibrationLeader?.id === first.id;
        const telemetry = buildTelemetrySummary();

        els.resultOneImage.src = first.url;
        els.resultTwoImage.src = second.url;
        els.resultOneImage.alt = `${first.name}, run 1 champion`;
        els.resultTwoImage.alt = `${second.name}, run 2 champion`;
        els.resultOneName.textContent = first.name;
        els.resultTwoName.textContent = second.name;
        els.resultVerdict.classList.toggle("is-split", !fullAgreement);
        els.metricDecisions.textContent = String(telemetry.recordedDecisionCount);
        els.metricMedian.textContent = telemetry.medianDecisionMs === null ? "No data" : `${(telemetry.medianDecisionMs / 1000).toFixed(1)}s`;
        if (telemetry.leftSelections === telemetry.rightSelections) {
          els.metricSide.textContent = "Balanced";
        } else if (telemetry.leftSelections > telemetry.rightSelections) {
          els.metricSide.textContent = `Left ${Math.round(telemetry.leftSelectionRate * 100)}%`;
        } else {
          els.metricSide.textContent = `Right ${Math.round(telemetry.rightSelectionRate * 100)}%`;
        }
        els.metricRepeat.textContent = telemetry.repeatedPairCount
          ? `${telemetry.repeatedPairAgreementCount}/${telemetry.repeatedPairCount} (${Math.round(telemetry.repeatedPairAgreementRate * 100)}%)`
          : "No repeats";

        if (fullAgreement) {
          els.resultSummary.textContent = `Both independently seeded brackets and the top-four calibration selected ${first.name}.`;
          els.resultVerdict.textContent = "Stable winner";
        } else if (!bracketAgreement && (calibrationLeader?.id === first.id || calibrationLeader?.id === second.id)) {
          els.resultSummary.textContent = `The brackets split between ${first.name} and ${second.name}. The balanced top-four calibration favored ${calibrationLeader.name}; treat it as the leading direction, not a conclusive winner.`;
          els.resultVerdict.textContent = `Calibration favors ${calibrationLeader.name}`;
        } else if (bracketAgreement) {
          els.resultSummary.textContent = `Both brackets selected ${first.name}, but the top-four calibration favored ${calibrationLeader?.name || "another concept"}. The preference signal is contested.`;
          els.resultVerdict.textContent = "Contested result";
        } else {
          els.resultSummary.textContent = `The brackets split between ${first.name} and ${second.name}, while the top-four calibration favored ${calibrationLeader?.name || "another concept"}. No stable winner emerged.`;
          els.resultVerdict.textContent = "Contested result";
        }
        renderLockControls();
        renderReviewBoard();
        renderReviewControls();
      }

      function render() {
        renderBatchControls();
        if (state.phase === "setup") {
          setScreen(els.setupScreen);
          renderSetup();
        } else if (state.phase === "play" || state.phase === "calibration") {
          setScreen(els.playScreen);
          renderPlay();
        } else if (state.phase === "between") {
          setScreen(els.betweenScreen);
          renderBetween();
        } else if (state.phase === "results") {
          setScreen(els.resultsScreen);
          renderResults();
        }

        const decisionName = els.setName.value.trim();
        document.title = decisionName ? `${decisionName} · Concept Tournament` : "Concept Tournament";
      }

      // Telemetry export and saved attempts
      function exportAsset(id) {
        const asset = assetById(id);
        return asset ? {
          id: asset.id,
          name: asset.name,
          fileName: asset.fileName,
          relativePath: asset.relativePath,
          sourceKind: asset.sourceKind,
          metadata: asset.metadata
        } : null;
      }

      function buildResultPayload() {
        if (state.phase !== "results") return null;
        const first = assetById(state.runs[0].championId);
        const second = assetById(state.runs[1].championId);
        const calibrationLeader = assetById(state.calibration?.championId);
        const bracketAgreement = first.id === second.id;
        const fullAgreement = bracketAgreement && calibrationLeader?.id === first.id;
        const calibrationComparisonCount = state.calibration?.rounds[0].matches.length || 0;
        const telemetrySummary = buildTelemetrySummary();
        const catalogEntry = currentCatalogEntry();
        const batchRecord = batchRecordForEntry(catalogEntry);
        const payload = {
          schemaVersion: VERSION,
          exportedAt: new Date().toISOString(),
          decisionName: els.setName.value.trim() || null,
          source: sourceDescriptor(),
          batchDecision: catalogEntry ? {
            catalogId: catalogEntry.id,
            status: batchRecord ? batchStatusForEntry(catalogEntry) : "reviewed",
            disposition: batchRecord?.disposition || "reviewed",
            notes: batchRecord?.notes || "",
            reviewConfirmedAt: batchRecord?.reviewConfirmedAt || null,
            annotations: normalizeAnnotations(batchRecord?.annotations),
            annotationSummary: buildAnnotationSummary(batchRecord?.annotations),
            lock: batchRecord?.lock || null
          } : null,
          settings: {
            grayscalePresentation: true,
            runCount: 2,
            distinctOpeningOrders: true,
            openingRoundOnlyByes: true,
            mirroredRepeatedPairs: true,
            calibrationCandidateCount: state.calibration?.candidateIds.length || 0,
            calibrationComparisonCount,
            namesHiddenByDefault: true,
            telemetryStorage: catalogEntry ? "localStorage-until-batch-export" : "in-memory-until-export"
          },
          assets: state.assets.map(asset => ({
            id: asset.id,
            name: asset.name,
            fileName: asset.fileName,
            relativePath: asset.relativePath,
            fileType: asset.fileType,
            fileSize: asset.fileSize,
            lastModified: asset.lastModified,
            sourceKind: asset.sourceKind,
            metadata: asset.metadata
          })),
          runs: state.runs.map(run => ({
            runNumber: run.runNumber,
            startedAt: run.startedAt,
            completedAt: run.completedAt,
            seedOrder: run.seedOrder.map(exportAsset),
            openingPairSignature: openingPairSignature(run.seedOrder),
            rounds: run.rounds.map(round => ({
              roundNumber: round.index + 1,
              label: roundName(round.index),
              matches: round.matches.map(match => ({
                matchId: match.id,
                left: exportAsset(match.leftId),
                right: exportAsset(match.rightId),
                winner: exportAsset(match.winnerId),
                automaticBye: match.automaticBye,
                choice: match.automaticBye ? null : (() => {
                  const choice = run.history.find(item => item.matchId === match.id && item.roundIndex === round.index);
                  return choice ? {
                    selectedSide: choice.selectedSide,
                    loser: exportAsset(choice.loserId),
                    decisionMs: choice.decisionMs,
                    namesVisible: choice.namesVisible,
                    selectedAt: choice.selectedAt,
                    telemetryEventSequence: choice.telemetryEventSequence
                  } : null;
                })()
              }))
            })),
            champion: exportAsset(run.championId)
          })),
          calibration: state.calibration ? {
            startedAt: state.calibration.startedAt,
            completedAt: state.calibration.completedAt,
            candidates: state.calibration.candidateIds.map(exportAsset),
            comparisons: state.calibration.rounds[0].matches.map(match => {
              const choice = state.calibration.history.find(item => item.matchId === match.id);
              return {
                matchId: match.id,
                left: exportAsset(match.leftId),
                right: exportAsset(match.rightId),
                winner: exportAsset(match.winnerId),
                choice: choice ? {
                  selectedSide: choice.selectedSide,
                  loser: exportAsset(choice.loserId),
                  decisionMs: choice.decisionMs,
                  namesVisible: choice.namesVisible,
                  selectedAt: choice.selectedAt,
                  telemetryEventSequence: choice.telemetryEventSequence
                } : null
              };
            }),
            standings: calibrationStandings().map(item => ({
              asset: exportAsset(item.assetId),
              wins: item.wins,
              losses: item.losses,
              bracketRank: item.bracketRank + 1
            })),
            leader: exportAsset(state.calibration.championId)
          } : null,
          result: {
            status: fullAgreement
              ? "stable"
              : (!bracketAgreement && (calibrationLeader?.id === first.id || calibrationLeader?.id === second.id) ? "calibration-favored" : "contested"),
            consensusChampion: fullAgreement ? exportAsset(first.id) : null,
            calibrationLeader: exportAsset(calibrationLeader?.id),
            bracketChampions: [exportAsset(first.id), exportAsset(second.id)]
          },
          telemetry: {
            schemaVersion: state.telemetry.schemaVersion,
            sessionId: state.telemetry.sessionId,
            startedAt: state.telemetry.startedAt,
            completedAt: state.telemetry.completedAt,
            source: state.telemetry.source,
            methodology: {
              validChoiceDefinition: "A choice event that was not later undone.",
              decisionTimeDefinition: "Milliseconds from first presentation of a matchup to selection; name-reveal time is included.",
              tagSignalDefinition: "Selected or rejected only when a tag appears on one side of a valid comparison, not both.",
              interpretationCaution: "Two brackets plus a top-four round robin reduce order and bye effects but remain directional evidence, not a statistically conclusive preference model. Look for repeated signals across multiple concept batches."
            },
            events: state.telemetry.events,
            summary: telemetrySummary
          }
        };

        return payload;
      }

      function downloadJson(payload, filename) {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      function fileSlug(value, fallback = "concept-tournament") {
        return (String(value || fallback))
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || fallback;
      }

      function exportResults() {
        saveReviewNotes();
        const payload = buildResultPayload();
        if (!payload) return;
        downloadJson(payload, `${fileSlug(els.setName.value.trim())}-telemetry.json`);
      }

      function compactAttempt(payload) {
        const assetId = asset => asset?.id || null;
        return {
          schemaVersion: 1,
          sessionId: payload.telemetry.sessionId,
          startedAt: payload.telemetry.startedAt,
          completedAt: payload.telemetry.completedAt,
          savedAt: new Date().toISOString(),
          result: {
            status: payload.result.status,
            consensusChampionId: assetId(payload.result.consensusChampion),
            calibrationLeaderId: assetId(payload.result.calibrationLeader),
            bracketChampionIds: payload.result.bracketChampions.map(assetId)
          },
          review: payload.batchDecision ? {
            status: payload.batchDecision.status,
            disposition: payload.batchDecision.disposition,
            notes: payload.batchDecision.notes,
            reviewConfirmedAt: payload.batchDecision.reviewConfirmedAt,
            annotations: payload.batchDecision.annotations,
            annotationSummary: payload.batchDecision.annotationSummary
          } : null,
          runs: payload.runs.map(run => ({
            runNumber: run.runNumber,
            startedAt: run.startedAt,
            completedAt: run.completedAt,
            seedOrderIds: run.seedOrder.map(assetId),
            openingPairSignature: run.openingPairSignature,
            rounds: run.rounds.map(round => ({
              roundNumber: round.roundNumber,
              label: round.label,
              matches: round.matches.map(match => ({
                matchId: match.matchId,
                leftId: assetId(match.left),
                rightId: assetId(match.right),
                winnerId: assetId(match.winner),
                automaticBye: match.automaticBye,
                choice: match.choice ? {
                  selectedSide: match.choice.selectedSide,
                  loserId: assetId(match.choice.loser),
                  decisionMs: match.choice.decisionMs,
                  namesVisible: match.choice.namesVisible,
                  selectedAt: match.choice.selectedAt,
                  telemetryEventSequence: match.choice.telemetryEventSequence
                } : null
              }))
            })),
            championId: assetId(run.champion)
          })),
          calibration: payload.calibration ? {
            startedAt: payload.calibration.startedAt,
            completedAt: payload.calibration.completedAt,
            candidateIds: payload.calibration.candidates.map(assetId),
            comparisons: payload.calibration.comparisons.map(match => ({
              matchId: match.matchId,
              leftId: assetId(match.left),
              rightId: assetId(match.right),
              winnerId: assetId(match.winner),
              choice: match.choice ? {
                selectedSide: match.choice.selectedSide,
                loserId: assetId(match.choice.loser),
                decisionMs: match.choice.decisionMs,
                namesVisible: match.choice.namesVisible,
                selectedAt: match.choice.selectedAt,
                telemetryEventSequence: match.choice.telemetryEventSequence
              } : null
            })),
            standings: payload.calibration.standings.map(item => ({
              assetId: assetId(item.asset),
              wins: item.wins,
              losses: item.losses,
              bracketRank: item.bracketRank
            })),
            leaderId: assetId(payload.calibration.leader)
          } : null,
          telemetry: payload.telemetry
        };
      }

      function persistCurrentAttempt(recordOverride = null) {
        if (state.phase !== "results") return null;
        const entry = currentCatalogEntry();
        const payload = buildResultPayload();
        if (!entry || !payload) return null;
        const record = recordOverride || ensureBatchRecord(entry);
        record.name = entry.name;
        record.category = entry.category;
        record.folder = entry.folder;
        record.manifestPath = entry.manifestPath;
        record.disposition = record.disposition || "reviewed";
        record.notes = typeof record.notes === "string" ? record.notes : "";
        record.reviewConfirmedAt = typeof record.reviewConfirmedAt === "string" ? record.reviewConfirmedAt : null;
        record.annotations = normalizeAnnotations(record.annotations);
        record.annotationSummary = buildAnnotationSummary(record.annotations);
        record.assets = state.assets.map(asset => ({
          id: asset.id,
          name: asset.name,
          fileName: asset.fileName,
          relativePath: asset.relativePath,
          sourceKind: asset.sourceKind,
          metadata: asset.metadata
        }));
        const attempt = compactAttempt(payload);
        record.attempts = (Array.isArray(record.attempts) ? record.attempts : [])
          .filter(item => item.sessionId !== attempt.sessionId);
        record.attempts.push(attempt);
        record.attempts = record.attempts.slice(-MAX_SAVED_ATTEMPTS_PER_SET);
        record.updatedAt = new Date().toISOString();
        state.batch.records[entry.id] = record;
        writeBatchState();
        return record;
      }

      function removePersistedCurrentAttempt() {
        const entry = currentCatalogEntry();
        const record = batchRecordForEntry(entry);
        if (!entry || !record || !Array.isArray(record.attempts)) return;
        record.attempts = record.attempts.filter(item => item.sessionId !== state.telemetry.sessionId);
        if (record.lock?.sessionId === state.telemetry.sessionId) record.lock = null;
        record.updatedAt = new Date().toISOString();
        const preservesReview = Boolean(record.reviewConfirmedAt) || Boolean(record.notes?.trim()) || normalizeAnnotations(record.annotations).length > 0 ||
          ["refine", "combine", "redo", "removed"].includes(record.disposition);
        if (!record.attempts.length && !record.lock && !preservesReview) delete state.batch.records[entry.id];
        writeBatchState();
      }

      function renderLockControls() {
        if (state.phase !== "results") return;
        const entry = currentCatalogEntry();
        const record = batchRecordForEntry(entry);
        const lockedAsset = record?.lock?.asset || null;
        const standings = calibrationStandings();
        const candidateIds = state.assets.map(asset => asset.id);

        els.lockCandidate.textContent = "";
        candidateIds.forEach(assetId => {
          const asset = assetById(assetId);
          if (!asset) return;
          const standing = standings.find(item => item.assetId === assetId);
          const standingIndex = standings.findIndex(item => item.assetId === assetId);
          const bracketWins = state.runs.filter(run => run.championId === assetId).length;
          const option = document.createElement("option");
          option.value = asset.id;
          option.textContent = standing
            ? `${asset.name} - calibration #${standingIndex + 1} (${standing.wins}-${standing.losses})`
            : bracketWins
              ? `${asset.name} - bracket winner`
              : `${asset.name} - available for final review`;
          els.lockCandidate.append(option);
        });

        const selectedId = lockedAsset?.id && candidateIds.includes(lockedAsset.id)
          ? lockedAsset.id
          : assetById(state.reviewAssetId)
            ? state.reviewAssetId
            : state.calibration?.championId || candidateIds[0] || "";
        state.reviewAssetId = selectedId || null;
        els.lockCandidate.value = selectedId;
        const canLock = Boolean(entry && assetById(selectedId));
        els.lockCandidate.disabled = !canLock;
        els.lockButton.disabled = !canLock;
        els.lockButton.textContent = lockedAsset ? "Update production art" : "Approve as production art";
        els.unlockButton.hidden = !lockedAsset;
        els.lockStatus.classList.toggle("is-locked", Boolean(lockedAsset));
        if (!entry) {
          els.lockStatus.textContent = "Production approval is available for catalog-backed art reviews.";
        } else if (lockedAsset) {
          els.lockStatus.textContent = `Production art approved: ${lockedAsset.name}. No further concept iteration will be scheduled.`;
        } else {
          els.lockStatus.textContent = "Approve only when no more concept iteration is needed and the selected image should become production art.";
        }
        renderConceptIntent();
      }

      function renderConceptIntent() {
        if (state.phase !== "results") return;
        const asset = assetById(state.reviewAssetId || els.lockCandidate.value);
        const metadata = asset?.metadata;
        const hasIntent = Boolean(metadata && (
          metadata.businessCue || metadata.controlledVariable || metadata.thesis
        ));
        els.conceptIntentName.textContent = asset?.name || "Selected concept";
        els.conceptIntentGrid.hidden = !hasIntent;
        els.conceptIntentEmpty.hidden = hasIntent;
        if (!hasIntent) return;
        els.conceptIntentCue.textContent = metadata.businessCue || "No domain-specific idea was recorded.";
        els.conceptIntentGeometry.textContent = metadata.controlledVariable || "No architectural move was recorded.";
        els.conceptIntentThesis.textContent = metadata.thesis || "No design thesis was recorded.";
      }

      function renderReviewSaveState(record, { enabled = true, saving = false } = {}) {
        const confirmed = Boolean(record?.reviewConfirmedAt);
        els.confirmReviewButton.disabled = !enabled || confirmed;
        els.confirmReviewButton.textContent = confirmed ? "Review saved" : "Save review";
        els.reviewSaveStatus.classList.toggle("is-confirmed", confirmed);
        if (!enabled) {
          els.reviewSaveStatus.textContent = "Review confirmation is available for catalog-backed art reviews.";
          return;
        }
        if (saving) {
          els.reviewSaveStatus.textContent = "Saving draft locally...";
          return;
        }
        if (confirmed) {
          const markCount = normalizeAnnotations(record.annotations).length;
          const markLabel = `${markCount} marked area${markCount === 1 ? "" : "s"}`;
          const noteLabel = record.notes?.trim() ? " and overall notes" : "";
          els.reviewSaveStatus.textContent = `Review saved. ${markLabel}${noteLabel} will be included in telemetry export.`;
          return;
        }
        els.reviewSaveStatus.textContent = "Draft saved locally. Select Save review to confirm it for telemetry export.";
      }

      function renderReviewControls() {
        if (state.phase !== "results") return;
        const entry = currentCatalogEntry();
        const record = batchRecordForEntry(entry);
        const enabled = Boolean(entry);
        els.reviewDisposition.disabled = !enabled;
        els.reviewNotes.disabled = !enabled;
        els.reviewDisposition.value = record?.disposition || "reviewed";
        if (document.activeElement !== els.reviewNotes) {
          els.reviewNotes.value = record?.notes || "";
        }
        renderReviewSaveState(record, { enabled });
      }

      function saveReviewNotes() {
        if (reviewNotesSaveTimer) {
          window.clearTimeout(reviewNotesSaveTimer);
          reviewNotesSaveTimer = null;
        }
        if (state.phase !== "results") return;
        const entry = currentCatalogEntry();
        if (!entry) return;
        const record = ensureBatchRecord(entry);
        const notes = els.reviewNotes.value.slice(0, 4000).trimEnd();
        if (record.notes === notes && !reviewDraftDirty) {
          renderReviewSaveState(record);
          return;
        }
        record.notes = notes;
        record.reviewConfirmedAt = null;
        reviewDraftDirty = false;
        persistCurrentAttempt(record);
        renderReviewSaveState(record);
      }

      function scheduleReviewNotesSave() {
        if (state.phase !== "results" || !currentCatalogEntry()) return;
        if (reviewNotesSaveTimer) window.clearTimeout(reviewNotesSaveTimer);
        const record = ensureBatchRecord(currentCatalogEntry());
        record.reviewConfirmedAt = null;
        reviewDraftDirty = true;
        renderReviewSaveState(record, { saving: true });
        reviewNotesSaveTimer = window.setTimeout(saveReviewNotes, 450);
      }

      function confirmCurrentReview({ announce: shouldAnnounce = true } = {}) {
        if (state.phase !== "results") return null;
        saveReviewNotes();
        const entry = currentCatalogEntry();
        if (!entry) return null;
        const record = ensureBatchRecord(entry);
        if (!record.reviewConfirmedAt) {
          record.reviewConfirmedAt = new Date().toISOString();
          recordEvent("review_confirmed", {
            catalogId: entry.id,
            annotationCount: normalizeAnnotations(record.annotations).length,
            hasNotes: Boolean(record.notes?.trim()),
            disposition: record.disposition || "reviewed"
          });
          persistCurrentAttempt(record);
        }
        renderReviewControls();
        if (shouldAnnounce) announce(`Review saved for ${entry.name}.`);
        return record;
      }

      function setReviewDisposition() {
        if (state.phase !== "results") return;
        saveReviewNotes();
        const entry = currentCatalogEntry();
        if (!entry) return;
        const record = ensureBatchRecord(entry);
        const nextDisposition = REVIEW_DISPOSITIONS.has(els.reviewDisposition.value)
          ? els.reviewDisposition.value
          : "reviewed";
        const previousDisposition = record.disposition || "reviewed";
        const previousLockId = record.lock?.asset?.id || null;
        if (nextDisposition !== "reviewed") record.lock = null;
        if (nextDisposition !== previousDisposition) record.reviewConfirmedAt = null;
        record.disposition = nextDisposition;
        recordEvent("review_disposition_changed", {
          catalogId: entry.id,
          previousDisposition,
          disposition: nextDisposition,
          clearedLockAssetId: previousLockId && !record.lock ? previousLockId : null
        });
        persistCurrentAttempt(record);
        renderLockControls();
        renderReviewControls();
        const message = ({
          refine: `${entry.name} marked to refine the selected direction.`,
          combine: `${entry.name} marked to combine annotated concepts.`,
          redo: `${entry.name} marked for a full redesign.`,
          removed: `${entry.name} removed from the art review queue.`,
          reviewed: `${entry.name} kept available for another review pass.`
        })[nextDisposition];
        announce(message);
      }

      function lockSelectedDesign() {
        if (state.phase !== "results") return;
        saveReviewNotes();
        const entry = currentCatalogEntry();
        const asset = assetById(els.lockCandidate.value);
        if (!entry || !asset) return;
        const record = ensureBatchRecord(entry);
        const previousLock = record.lock;
        const lockedAt = new Date().toISOString();
        recordEvent(previousLock ? "design_lock_updated" : "design_locked", {
          catalogId: entry.id,
          assetId: asset.id,
          previousAssetId: previousLock?.asset?.id || null
        });
        record.lock = {
          asset: exportAsset(asset.id),
          lockedAt,
          sessionId: state.telemetry.sessionId,
          resultStatus: buildResultPayload()?.result.status || null,
          skipNextPass: true
        };
        record.disposition = "reviewed";
        record.reviewConfirmedAt = lockedAt;
        state.reviewAssetId = asset.id;
        persistCurrentAttempt(record);
        renderLockControls();
        renderReviewControls();
        announce(`${asset.name} approved as production art.`);
      }

      function unlockCurrentDesign() {
        if (state.phase !== "results") return;
        saveReviewNotes();
        const entry = currentCatalogEntry();
        const record = batchRecordForEntry(entry);
        if (!entry || !record?.lock) return;
        const previousAsset = record.lock.asset;
        recordEvent("design_unlocked", {
          catalogId: entry.id,
          assetId: previousAsset?.id || null
        });
        record.lock = null;
        persistCurrentAttempt(record);
        renderLockControls();
        renderReviewControls();
        announce(`${previousAsset?.name || entry.name} returned to iteration.`);
      }

      function nextUnlockedEntry() {
        const entries = state.catalog.entries.filter(entry => entry.status === "ready");
        if (!entries.length) return null;
        const currentIndex = Math.max(-1, entries.findIndex(entry => entry.id === currentCatalogEntry()?.id));
        const ordered = entries.map((_, offset) => entries[(currentIndex + 1 + offset) % entries.length]);
        return ordered.find(entry => batchStatusForEntry(entry) === "pending") ||
          ordered.find(entry => batchStatusForEntry(entry) === "redo") ||
          ordered.find(entry => batchStatusForEntry(entry) === "refine") ||
          ordered.find(entry => batchStatusForEntry(entry) === "combine") ||
          ordered.find(entry => batchStatusForEntry(entry) === "reviewed") || null;
      }

      function loadNextUnlockedTournament() {
        confirmCurrentReview({ announce: false });
        const entry = nextUnlockedEntry();
        if (!entry) {
          announce("Every active tournament is approved or removed.");
          return;
        }
        loadSetManifest(entry.manifestPath, { updateUrl: true });
      }

      function exportBatchTelemetry() {
        saveReviewNotes();
        const sets = state.catalog.entries.map(entry => ({
          catalog: entry,
          status: batchStatusForEntry(entry),
          record: batchRecordForEntry(entry)
        }));
        const activeSets = sets.filter(item => item.status !== "excluded");
        const reviewSets = sets.filter(item => item.catalog.status === "ready");
        const reviewedCount = reviewSets.filter(item => item.status !== "pending").length;
        const lockedCount = reviewSets.filter(item => item.status === "locked").length;
        const refineCount = reviewSets.filter(item => item.status === "refine").length;
        const combineCount = reviewSets.filter(item => item.status === "combine").length;
        const redoCount = reviewSets.filter(item => item.status === "redo").length;
        const removedCount = reviewSets.filter(item => item.status === "removed").length;
        const excludedCount = sets.filter(item => item.status === "excluded").length;
        const variantKitCount = sets.filter(item => item.status === "variant-kit").length;
        const payload = {
          schemaVersion: BATCH_SCHEMA_VERSION,
          exportedAt: new Date().toISOString(),
          catalogGeneratedAt: state.catalog.generatedAt,
          storage: "local-browser-only-until-export",
          attemptRetention: {
            policy: "latest-completed-review-per-asset",
            maximumPerAsset: MAX_SAVED_ATTEMPTS_PER_SET,
            freshSessionOn: ["start-review", "same-set-rerun"]
          },
          summary: {
            setCount: sets.length,
            activeSetCount: activeSets.length,
            reviewSetCount: reviewSets.length,
            variantKitCount,
            excludedCount,
            reviewedCount,
            lockedCount,
            refineCount,
            combineCount,
            redoCount,
            removedCount,
            pendingCount: reviewSets.length - reviewedCount,
            savedAttemptCount: sets.reduce((sum, item) => sum + (item.record?.attempts?.length || 0), 0)
          },
          methodology: {
            reviewed: "At least one complete two-pass bracket and top-four calibration is saved.",
            locked: "The user explicitly approved a selected design as production art, ending further concept iteration.",
            refine: "The user selected a concept direction to preserve while making targeted changes from notes and annotations.",
            combine: "The user requested a hybrid direction assembled from annotated areas across multiple concepts.",
            redo: "The user explicitly requested an entirely new concept batch.",
            removed: "The user removed the asset from the active art review queue.",
            excluded: "The asset was excluded from the active catalog and never enters the tournament queue.",
            "variant-kit": "The asset is a required multi-variant production kit and does not require tournament review.",
            pending: "No complete saved tournament is available for this asset."
          },
          sets
        };
        downloadJson(payload, `art-review-tournament-batch-${new Date().toISOString().slice(0, 10)}.json`);
      }

      function resetForNewSet() {
        saveReviewNotes();
        state.manifestLoadToken += 1;
        releaseAssets();
        state.phase = "setup";
        state.loadedSet = null;
        state.runs = [];
        state.activeRunIndex = -1;
        state.calibration = null;
        state.reviewAssetId = null;
        state.annotationDraft = null;
        state.revealNames = false;
        state.telemetry = createTelemetrySession();
        els.setName.value = "";
        els.fileInput.value = "";
        els.folderInput.value = "";
        els.tournamentSelect.value = "";
        updateSetRoute(null);
        setError();
        refreshTournamentOptions();
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      function toggleNames() {
        if (state.phase !== "play" && state.phase !== "calibration") return;
        state.revealNames = !state.revealNames;
        const run = activeRun();
        const match = currentMatch(run);
        recordEvent(state.revealNames ? "names_revealed" : "names_hidden", {
          runNumber: run?.runNumber || null,
          roundNumber: run ? run.activeRoundIndex + 1 : null,
          matchId: match?.id || null,
          leftId: match?.leftId || null,
          rightId: match?.rightId || null
        });
        renderPlay();
        announce(state.revealNames ? "Concept names revealed." : "Concept names hidden.");
      }

      // Event wiring
      els.fileInput.addEventListener("change", () => {
        addFiles(els.fileInput.files);
        els.fileInput.value = "";
      });
      els.folderInput.addEventListener("change", async () => {
        await loadFolderFiles(els.folderInput.files);
        els.folderInput.value = "";
      });
      els.tournamentSelect.addEventListener("change", () => {
        const route = els.tournamentSelect.value;
        if (route) loadSetManifest(route, { updateUrl: true });
      });
      els.nextUnlockedSetup.addEventListener("click", loadNextUnlockedTournament);
      els.batchExportSetup.addEventListener("click", exportBatchTelemetry);
      els.startButton.addEventListener("click", startFirstRun);
      els.candidateLeft.addEventListener("click", () => choose("left"));
      els.candidateRight.addEventListener("click", () => choose("right"));
      els.toggleNames.addEventListener("click", toggleNames);
      els.undoButton.addEventListener("click", undoLastChoice);
      els.betweenUndo.addEventListener("click", undoLastChoice);
      els.secondRunButton.addEventListener("click", startSecondRun);
      els.resultsUndo.addEventListener("click", undoLastChoice);
      els.exportButton.addEventListener("click", exportResults);
      els.lockCandidate.addEventListener("change", () => selectReviewAsset(els.lockCandidate.value));
      els.lockButton.addEventListener("click", lockSelectedDesign);
      els.unlockButton.addEventListener("click", unlockCurrentDesign);
      els.annotationSurface.addEventListener("pointerdown", startAnnotation);
      els.annotationSurface.addEventListener("pointermove", moveAnnotation);
      els.annotationSurface.addEventListener("pointerup", finishAnnotation);
      els.annotationSurface.addEventListener("pointercancel", cancelAnnotation);
      els.annotationWhole.addEventListener("click", markWholeConcept);
      els.reviewDisposition.addEventListener("change", setReviewDisposition);
      els.reviewNotes.addEventListener("input", scheduleReviewNotesSave);
      els.reviewNotes.addEventListener("blur", saveReviewNotes);
      els.confirmReviewButton.addEventListener("click", confirmCurrentReview);
      els.batchExportResults.addEventListener("click", exportBatchTelemetry);
      els.nextTournamentButton.addEventListener("click", loadNextUnlockedTournament);
      els.rerunButton.addEventListener("click", rerunSameSet);
      els.newSetButton.addEventListener("click", resetForNewSet);

      document.addEventListener("keydown", event => {
        const target = event.target;
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable) return;
        if (state.phase !== "play" && state.phase !== "calibration") return;

        if (event.key === "1" || event.key === "ArrowLeft") {
          event.preventDefault();
          choose("left");
        } else if (event.key === "2" || event.key === "ArrowRight") {
          event.preventDefault();
          choose("right");
        } else if (event.key.toLowerCase() === "u") {
          undoLastChoice();
        } else if (event.key.toLowerCase() === "n") {
          toggleNames();
        }
      });

      window.addEventListener("pagehide", () => {
        saveReviewNotes();
        state.assets.forEach(asset => {
          if (asset.revokeOnRelease) URL.revokeObjectURL(asset.url);
        });
      }, { once: true });

      window.__conceptTournament = Object.freeze({
        version: VERSION,
        get phase() { return state.phase; },
        get assetCount() { return state.assets.length; },
        get runCount() { return state.runs.length; },
        get telemetryDecisionCount() { return validChoiceEvents().length; },
        get telemetrySessionId() { return state.telemetry.sessionId; },
        get catalogCount() { return state.catalog.entries.length; },
        get activeCatalogCount() { return state.catalog.entries.filter(entry => entry.status !== "excluded").length; },
        get reviewCatalogCount() { return state.catalog.entries.filter(entry => entry.status === "ready").length; },
        get variantKitCatalogCount() { return state.catalog.entries.filter(entry => entry.status === "variant-kit").length; },
        get excludedCatalogCount() { return state.catalog.entries.filter(entry => entry.status === "excluded").length; },
        get batchReviewedCount() {
          return state.catalog.entries.filter(entry => entry.status === "ready" && batchStatusForEntry(entry) !== "pending").length;
        },
        get batchLockedCount() {
          return state.catalog.entries.filter(entry => entry.status === "ready" && batchStatusForEntry(entry) === "locked").length;
        },
        get batchRefineCount() {
          return state.catalog.entries.filter(entry => entry.status === "ready" && batchStatusForEntry(entry) === "refine").length;
        },
        get batchCombineCount() {
          return state.catalog.entries.filter(entry => entry.status === "ready" && batchStatusForEntry(entry) === "combine").length;
        },
        get batchRedoCount() {
          return state.catalog.entries.filter(entry => entry.status === "ready" && batchStatusForEntry(entry) === "redo").length;
        },
        get batchRemovedCount() {
          return state.catalog.entries.filter(entry => entry.status === "ready" && batchStatusForEntry(entry) === "removed").length;
        },
        get currentAnnotationCount() { return normalizeAnnotations(currentReviewRecord()?.annotations).length; },
        get currentReviewConfirmedAt() { return currentReviewRecord()?.reviewConfirmedAt || null; },
        get selectedReviewAssetId() { return state.reviewAssetId; },
        buildResultPayload,
        exportBatchTelemetry,
        loadSetManifest,
        lockSelectedDesign,
        unlockCurrentDesign,
        loadSetDefinition,
        loadFolderFiles
      });

      refreshTournamentOptions();
      renderBatchControls();
      render();
      loadSetFromQuery();
    })();
