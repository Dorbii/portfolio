import Playground from "../General/Playground/Playground";
import "./css/algoVisualizer.css";
import Split from 'react-split';
import { DsProvider } from '../General/Playground/DsContext.jsx';
import Viewer from "./Viewer";
export default function AlgoVisualizer() {
    return (
        <>
            <DsProvider>
                <div className="algo-visualizer">
                    <Split className="split-v" minSize={0}>
                        <div >
                            <Viewer />
                        </div>
                        <Playground />

                    </Split>
                </div>
            </DsProvider>
        </>
    );
}
