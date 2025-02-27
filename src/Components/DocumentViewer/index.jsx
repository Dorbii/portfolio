import React from "react";
import resume from "../../assets/Documents/resume.png";
import "./css/doc.css";
function DocumentViewer() {
    return (
        <div>
            <img className="document" src={resume} />
        </div>
    );
}

export default DocumentViewer;