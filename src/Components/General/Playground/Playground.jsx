import PreferenceNav from "./PreferenceNav";
import './css/playground.css';
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode"
import { javascript } from "@codemirror/lang-javascript";
import Split from 'react-split';
import TestCases from "./TestCases.jsx";
import PlaygroundFooter from "./PlaygroundFooter.jsx";
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
                        <TestCases />
                    </div>
                </Split>
                <PlaygroundFooter />
            </div>
        </>
    );
}
