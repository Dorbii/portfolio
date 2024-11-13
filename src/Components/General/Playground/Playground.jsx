import PreferenceNav from "./PreferenceNav";
import './css/playground.css';
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode"
import Split from 'react-split';
import DataStructure from "./DataStructure.jsx";
import { useContext } from "react";
import { DsContext } from './DsContext.jsx';
import { python } from "@codemirror/lang-python";
export default function Playground() {
    const { ds } = useContext(DsContext);
    return (
        <>

            <div className="playground-container">
                <PreferenceNav />
                <Split className="split" direction="vertical" sizes={[60, 40]} minSize={60}>
                    <div className="playground-editor">
                        <CodeMirror
                            value={ds ? ds.code : ""}
                            theme={vscodeDark}
                            extensions={[python()]}
                            style={{ fontSize: 16 }}
                            editable={false} />
                    </div>
                    <div className="data-structure">
                        <DataStructure />
                    </div>
                </Split>
            </div>

        </>
    );
}
