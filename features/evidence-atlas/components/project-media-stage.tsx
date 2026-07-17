"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  nodeById,
  recordsForTrace,
  type EvidenceTrace,
} from "../model/evidence-data";
import type { ProjectMedia } from "../model/project-media";
import {
  PROJECT_ABORT_DURATION_MS,
  PROJECT_ENTRY_DURATION_MS,
  PROJECT_EXIT_DURATION_MS,
  type ProjectEntrySource,
} from "../model/project-transition";

type ProjectMediaStageProps = {
  media: ProjectMedia;
  project: EvidenceTrace;
  origin: { x: number; y: number };
  entrySource: ProjectEntrySource;
  entryReady: boolean;
  exiting: boolean;
  onExitStart: () => void;
};

type ProjectMediaPhase = "loading" | "playing" | "details";

const WARP_PARTICLE_COUNT = 28;

export function ProjectMediaStage({
  media,
  project,
  origin,
  entrySource,
  entryReady,
  exiting,
  onExitStart,
}: ProjectMediaStageProps) {
  const stageRef = useRef<HTMLElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const detailsHeadingRef = useRef<HTMLHeadingElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const abortTimerRef = useRef<number | null>(null);
  const abortStartedRef = useRef(false);
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [mediaReady, setMediaReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [aborting, setAborting] = useState(false);
  const [phase, setPhase] = useState<ProjectMediaPhase>(
    reducedMotion ? "details" : "loading",
  );
  const records = useMemo(() => recordsForTrace(project.id), [project.id]);
  const flowRecords = useMemo(
    () => records.filter((record) => record.presentation !== "supporting"),
    [records],
  );

  const requestAbort = useCallback(() => {
    if (abortStartedRef.current || exiting) return;
    abortStartedRef.current = true;
    videoRef.current?.pause();
    setPaused(true);

    if (reducedMotion || phase === "details") {
      onExitStart();
      return;
    }

    setAborting(true);
    abortTimerRef.current = window.setTimeout(() => {
      abortTimerRef.current = null;
      onExitStart();
    }, PROJECT_ABORT_DURATION_MS);
  }, [exiting, onExitStart, phase, reducedMotion]);

  useEffect(
    () => () => {
      if (abortTimerRef.current !== null) {
        window.clearTimeout(abortTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    actionRef.current?.focus();
  }, []);

  useEffect(() => {
    if (phase === "details") detailsHeadingRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        requestAbort();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = stageRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), a[href]",
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleDialogKeys);
    return () => window.removeEventListener("keydown", handleDialogKeys);
  }, [requestAbort]);

  const beginPlayback = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !mediaReady || videoFailed || exiting) return;
    try {
      await video.play();
      setPaused(false);
      setPhase("playing");
    } catch {
      setPaused(true);
    }
  }, [exiting, mediaReady, videoFailed]);

  useEffect(() => {
    if (!entryReady || exiting) return;
    if (reducedMotion || videoFailed) return;
    const video = videoRef.current;
    if (!mediaReady || !video) return;

    let cancelled = false;
    void video.play().then(
      () => {
        if (cancelled) return;
        setPaused(false);
        setPhase("playing");
      },
      () => {
        if (!cancelled) setPaused(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [entryReady, exiting, mediaReady, reducedMotion, videoFailed]);

  const stageStyle = {
    "--portal-origin-x": `${origin.x}px`,
    "--portal-origin-y": `${origin.y}px`,
    "--project-abort-duration": `${PROJECT_ABORT_DURATION_MS}ms`,
    "--project-entry-duration": `${PROJECT_ENTRY_DURATION_MS[entrySource]}ms`,
    "--project-exit-duration": `${PROJECT_EXIT_DURATION_MS}ms`,
    "--media-progress": progress,
  } as CSSProperties;

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void beginPlayback();
    } else {
      video.pause();
      setPaused(true);
    }
  };

  const showDetails = () => {
    videoRef.current?.pause();
    setPaused(true);
    setPhase("details");
  };

  return (
    <section
      ref={stageRef}
      className={`project-media-stage phase-${phase} ${entryReady ? "is-entry-ready" : ""} ${aborting ? "is-aborting" : ""} ${exiting ? "is-exiting" : ""}`}
      style={stageStyle}
      role="dialog"
      aria-modal="true"
      aria-label={`${media.title} project experience`}
    >
      <div className="project-warp-field" aria-hidden="true">
        {Array.from({ length: WARP_PARTICLE_COUNT }, (_, index) => (
          <i
            key={index}
            style={{ "--warp-index": index } as CSSProperties}
          />
        ))}
      </div>

      <div className="project-media-scene" aria-hidden={phase === "details"}>
        <div
          className="project-media-poster"
          style={{ backgroundImage: `url("${media.posterSrc}")` }}
        />
        <video
          ref={videoRef}
          src={media.videoSrc}
          poster={media.posterSrc}
          muted
          playsInline
          preload="auto"
          onCanPlay={() => setMediaReady(true)}
          onEnded={showDetails}
          onError={() => {
            setVideoFailed(true);
            showDetails();
          }}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            setProgress(
              video.duration > 0 ? video.currentTime / video.duration : 0,
            );
          }}
        />
      </div>

      {phase === "details" ? (
        <article className="project-terminal">
          <header className="project-terminal-header">
            <div>
              <small>{project.period}</small>
              <h2 ref={detailsHeadingRef} tabIndex={-1}>
                {project.title}
              </h2>
            </div>
            <button type="button" onClick={onExitStart}>
              Return to atlas
            </button>
          </header>

          <div className="project-terminal-grid">
            <section className="project-terminal-brief" aria-labelledby="project-brief-title">
              <span>Project brief</span>
              <h3 id="project-brief-title">{project.statement}</h3>
              <p>{project.summary}</p>
              <ul>
                {project.outcomes.map((outcome) => (
                  <li key={outcome}>{outcome}</li>
                ))}
              </ul>
            </section>

            <section className="project-terminal-flow" aria-labelledby="project-flow-title">
              <div className="project-terminal-section-heading">
                <span>Documented flow</span>
                <strong>{flowRecords.length} stages</strong>
              </div>
              <h3 id="project-flow-title">What moves through the system</h3>
              <ol>
                {flowRecords.map((record) => (
                  <li key={record.id}>
                    <span>{String(record.sequence).padStart(2, "0")}</span>
                    <div>
                      <strong>{record.title}</strong>
                      <p>{record.detail}</p>
                      <small>
                        {record.nodeIds
                          .map((nodeId) => nodeById.get(nodeId)?.label)
                          .filter(Boolean)
                          .join(" / ")}
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <aside className="project-terminal-boundary">
              <span>Evidence boundary</span>
              {project.limitations.map((limitation) => (
                <p key={limitation}>{limitation}</p>
              ))}
            </aside>
          </div>
        </article>
      ) : (
        <header className="project-media-hud">
          <div>
            <small>{phase === "loading" ? "Assembling project" : "Project walkthrough"}</small>
            <strong>{media.title}</strong>
          </div>
          <nav aria-label="Project animation controls">
            {phase === "loading" && entryReady && mediaReady && paused ? (
              <button type="button" onClick={() => void beginPlayback()}>
                Play walkthrough
              </button>
            ) : null}
            {phase === "playing" ? (
              <button type="button" onClick={togglePlayback}>
                {paused ? "Resume" : "Pause"}
              </button>
            ) : null}
            <button ref={actionRef} type="button" onClick={showDetails}>
              Skip to details
            </button>
            <button type="button" onClick={onExitStart}>
              Return
            </button>
          </nav>
        </header>
      )}

      {phase !== "details" ? (
        <div className="project-media-progress" aria-hidden="true" />
      ) : null}
    </section>
  );
}
