import PreferenceNav from "./PreferenceNav";
import './css/playground.css';
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode"
import { javascript } from "@codemirror/lang-javascript";
export default function Playground() {

    return (
        <>
            <div className="playground-container">
                <PreferenceNav />
                <div className="playground-editor">
                    <CodeMirror
                        value={"// Write your code here"}
                        theme={vscodeDark}
                        extensions={[javascript()]}
                        style={{ fontSize: 16 }} />
                </div>
            </div>
        </>
    );
}
