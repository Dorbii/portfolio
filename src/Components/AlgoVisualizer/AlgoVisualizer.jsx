import Playground from "../General/Playground/Playground";
import "./css/algoVisualizer.css";
import Split from 'react-split';

export default function AlgoVisualizer() {

    return (
        <>
            <div className="algo-visualizer">
                <Split className="split-v" minSize={0}>
                    <div className='flex h-11 w-full'>
                        VISUAL
                    </div>
                    <Playground />

                </Split>
            </div>
        </>
    );
}
