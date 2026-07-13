export function WorkspaceHeader() {
  return (
    <header className="workspace-header">
      <div className="identity-copy">
        <h1>Steven Doris</h1>
        <p>Senior full-stack / platform engineer</p>
      </div>
      <nav aria-label="Portfolio links">
        <a href="mailto:stevemdoris@gmail.com">Email</a>
        <a href="https://github.com/Dorbii">GitHub</a>
        <a href="https://www.linkedin.com/in/stevendoris">LinkedIn</a>
        <a className="resume-link" href="/steven-doris-resume.pdf">
          Resume PDF
        </a>
        <a
          className="ats-link"
          href="/steven-doris-resume.docx"
          download
        >
          ATS DOCX
        </a>
      </nav>
    </header>
  );
}
