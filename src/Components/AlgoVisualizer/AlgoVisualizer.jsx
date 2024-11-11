import Playground from "../General/Playground/Playground";
import "./css/algoVisualizer.css";
import Split from 'react-split';
import TwoDArray from "../General/Playground/TwoDArray.jsx";
import { useState } from 'react';
import { dsContext } from '../General/Playground/DsContext.js';
export default function AlgoVisualizer() {
    const [getCode, setCode] = useState({ array: [] })
    return (
        <>
            <dsContext.Provider value={{ getCode, setCode }}>
                <div className="algo-visualizer">
                    <Split className="split-v" minSize={0}>
                        <div className='flex h-11 w-full'>
                            <TwoDArray />
                        </div>
                        <Playground />

                    </Split>
                </div>
            </dsContext.Provider>
        </>
    );
}
