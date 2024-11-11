import PreferenceNav from "./PreferenceNav";
import './css/playground.css';
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode"
import { javascript } from "@codemirror/lang-javascript";
import Split from 'react-split';
import TestCases from "./TestCases.jsx";
import PlaygroundFooter from "./PlaygroundFooter.jsx";
import { useContext, useState } from "react";
import { dsContext } from './DsContext.js';
export default function Playground() {
    const [getCmCode, setCmCode] = useState("");
    const { getCode, setCode } = useContext(dsContext);
    const handleSubmit = () => {
        const newString = getCmCode.replace(/[[\]]/g, '').split(',');
        setCode({ array: [...newString] });
    };
    return (
        <>
            <dsContext.Provider value={{ getCode, setCode }}>
                <div className="playground-container">
                    <PreferenceNav />
                    <Split className="split" direction="vertical" sizes={[60, 40]} minSize={60}>
                        <div className="playground-editor">
                            <CodeMirror
                                value={getCmCode}
                                theme={vscodeDark}
                                extensions={[javascript()]}
                                style={{ fontSize: 16 }}
                                onChange={(value) => setCmCode(value)} />
                        </div>
                        <div className="test-cases">
                            <TestCases />
                        </div>
                    </Split>
                    <PlaygroundFooter
                        handleSubmit={handleSubmit} />
                </div>
            </dsContext.Provider>

        </>
    );
}
