import './css/DataStructure.css';
import { useContext, useState } from 'react';
import { DsContext } from './DsContext.jsx';
import PlaygroundFooter from "./PlaygroundFooter";

export default function DataStructure() {
    const { updateDS, updateParams } = useContext(DsContext);
    const [getType, setType] = useState("TP");
    const [input, setInput] = useState("");
    //section input handlers start
    const onInputChange = (e) => {
        setInput(e.target.value);
    }
    //section input handlers end

    //section click handlers start
    const handleSubmit = () => {
        //updateParams(input, target);
        updateParams(input);
    }
    const handleClick = (dsType) => {
        setType(dsType);
        updateDS(getType);
    }
    //section click handlers end
    return (
        <>
            <div className="data-structure-header-container">
                <div className="data-structure-header-items">
                    <div className="data-structure-header-content">Data Structure</div>
                    <hr className="data-structure-header-hr" />
                </div>
            </div>
            <div className="data-structure-case-container">
                <div className="data-structure-case">
                    <div className="data-structure-case-selection">
                        <button className="data-structure-case-selection-title" onClick={() => handleClick("TP")}>
                            Two Pointers
                        </button>
                        <button className="data-structure-case-selection-title" onClick={() => handleClick("")}>
                            DS 2
                        </button>
                        <button className="data-structure-case-selection-title" onClick={() => handleClick("")}>
                            DS 3
                        </button>
                    </div>
                    <div className="data-structure-case-content">
                        <p className="data-structure-case-content-section">String:</p>
                        <input className="data-structure-case-content-section-content"
                            type='text'
                            placeholder='racecar'
                            onChange={onInputChange} />
                        {/* <p className="data-structure-case-content-section">Expected:</p>
                        <input className="data-structure-case-content-section-content"
                            type='text'
                            placeholder='True'
                            onChange={onTargetChange} /> */}
                    </div>
                </div>

            </div>
            <PlaygroundFooter handleSubmit={handleSubmit} />
        </>
    );
}
