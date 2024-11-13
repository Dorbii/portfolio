import Playground from "../General/Playground/Playground";
import "./css/algoVisualizer.css";
import Split from 'react-split';
import TwoDArray from "../General/Playground/TwoDArray.jsx";
import { DsProvider } from '../General/Playground/DsContext.jsx';
export default function AlgoVisualizer() {
    return (
        <>
            <DsProvider>
                <div className="algo-visualizer">
                    <Split className="split-v" minSize={0}>
                        <div className='flex h-11 w-full'>
                            <TwoDArray />
                        </div>
                        <Playground />

                    </Split>
                </div>
            </DsProvider>
        </>
    );
}
