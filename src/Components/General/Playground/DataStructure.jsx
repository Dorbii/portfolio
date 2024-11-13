import './css/DataStructure.css';
import { useContext, useState } from 'react';
import { DsContext } from './DsContext.jsx';
import PlaygroundFooter from "./PlaygroundFooter";

export default function DataStructure() {
    const { updateDS, updateParams } = useContext(DsContext);
    const [getType, setType] = useState("TP");
    const [input, setInput] = useState("");
    const [target, setTarget] = useState("");

    const onInputChange = (e) => {
        setInput(e.target.value);
    }
    const onTargetChange = (e) => {
        setTarget(e.target.value);
    }
    const handleSubmit = () => {
        updateParams(input, target);
    }
    const handleClick = (dsType) => {
        setType(dsType);
        updateDS(getType);
    }

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
                        <p className="data-structure-case-content-section">Array:</p>
                        <input className="data-structure-case-content-section-content"
                            type='text'
                            placeholder='[1,2,3,4,5,6]'
                            onChange={onInputChange} />
                        <p className="data-structure-case-content-section">Output:</p>
                        <input className="data-structure-case-content-section-content"
                            type='text'
                            placeholder='4'
                            onChange={onTargetChange} />
                    </div>
                </div>

            </div>
            <PlaygroundFooter handleSubmit={handleSubmit} />
        </>
    );
}
