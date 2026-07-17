import type { CareerProjectId, EmployerId } from "../model/world-registry";
import {
  careerWorldRegistry,
} from "../model/world-registry";

type WorldHitTargetsProps = {
  activeEmployerId: EmployerId | null;
  activeProjectId: CareerProjectId | null;
  onEmployer: (employerId: EmployerId) => void;
  onProject: (projectId: CareerProjectId, target: HTMLElement) => void;
};

export function WorldHitTargets({
  activeEmployerId,
  activeProjectId,
  onEmployer,
  onProject,
}: WorldHitTargetsProps) {
  const visibleProjects = activeEmployerId
    ? careerWorldRegistry.projects.filter(
        (project) => project.employerId === activeEmployerId,
      )
    : [];
  const projectSectionLabel = activeEmployerId
    ? `${careerWorldRegistry.employers.find((employer) => employer.id === activeEmployerId)?.label} projects`
    : "All projects";

  return (
    <nav className="career-world-navigation" aria-label="Career World landmark navigation">
      <section aria-labelledby="career-world-employers">
        <p className="career-world-eyebrow" id="career-world-employers">Employer cities</p>
        <div className="career-world-control-list">
          {careerWorldRegistry.employers.map((employer) => (
            <button
              key={employer.id}
              className="career-world-landmark-control"
              type="button"
              data-employer-id={employer.id}
              aria-pressed={activeEmployerId === employer.id}
              onClick={() => onEmployer(employer.id)}
            >
              {employer.label}
            </button>
          ))}
        </div>
      </section>
      {activeEmployerId ? (
        <>
          <section aria-labelledby="career-world-projects">
            <p className="career-world-eyebrow" id="career-world-projects">{projectSectionLabel}</p>
            <div className="career-world-control-list">
              {visibleProjects.map((project) => (
                <button
                  key={project.id}
                  id={`career-world-project-${project.id}`}
                  className="career-world-landmark-control"
                  type="button"
                  data-project-control={project.id}
                  aria-pressed={activeProjectId === project.id}
                  onClick={(event) => onProject(project.id, event.currentTarget)}
                >
                  <span>{project.label}</span>
                  <small>{project.evidenceStatus === "identity-only" ? "Resume identity" : "Evidence linked"}</small>
                </button>
              ))}
            </div>
          </section>
          <label className="career-world-project-index">
            <span>Project index</span>
            <select
              data-project-index-control=""
              value={activeProjectId ?? ""}
              onChange={(event) => {
                const projectId = event.target.value as CareerProjectId;
                if (!projectId) return;
                onProject(projectId, event.currentTarget);
              }}
            >
              <option value="">Choose a project</option>
              {visibleProjects.map((project) => (
                <option key={project.id} value={project.id}>{project.label}</option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <p className="career-world-navigation-note">
          Choose an employer city to reveal its project and skill buildings.
        </p>
      )}
    </nav>
  );
}
