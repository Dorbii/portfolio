import PreferenceNav from "./PreferenceNav";
import './css/playground.css';
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode"
import { javascript } from "@codemirror/lang-javascript";
import Split from 'react-split';
export default function Playground() {

    return (
        <>
            <div className="playground-container">
                <PreferenceNav />
                <Split className="split" direction="vertical" sizes={[60, 40]} minSize={60}>
                    <div className="playground-editor">
                        <CodeMirror
                            value={"var f = function(nums, target) {\n\tconsole.log(nums);\n\tconsole.log(target)\n};"}
                            theme={vscodeDark}
                            extensions={[javascript()]}
                            style={{ fontSize: 16 }} />
                    </div>
                    <div className="test-cases">
                        <div className="test-cases-header-container">
                            <div className="test-cases-header-items">
                                <div className="test-cases-header-content">Test Cases</div>
                                <hr className="test-cases-header-hr" />
                            </div>
                        </div>
                        <div className="test-cases-case-container">
                            <div className="test-cases-case">
                                <div className="test-cases-case-selection">
                                    <div className="test-cases-case-selection-title">
                                        Case 1
                                    </div>
                                    <div className="test-cases-case-selection-title">
                                        Case 2
                                    </div>
                                    <div className="test-cases-case-selection-title">
                                        Case 3
                                    </div>
                                </div>
                                <div className="test-cases-case-content">
                                    <p className="test-cases-case-content-section">Input:</p>
                                    <div className="test-cases-case-content-section-content">
                                        nums = [123], target = 321
                                    </div>
                                    <p className="test-cases-case-content-section">Output:</p>
                                    <div className="test-cases-case-content-section-content">
                                        target = 321
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>
                </Split>
            </div>
        </>
    );
}
