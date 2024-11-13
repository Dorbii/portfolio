import './css/DataStructure.css';
import { useContext, useState } from 'react';
import { DsContext } from './DsContext.jsx';

export default function DataStructure() {
    const { updateDS } = useContext(DsContext);
    const [getType, setType] = useState("");



    const handleClick = (dsType) => {
        if (getType === dsType) {
            setType("");
            updateDS("");
        } else {
            setType(dsType);
        }
        if (getType === "TP") {
            updateDS("TP");
        }
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
                        <div className="data-structure-case-content-section-content">
                            nums = [1,2,3,4,5,6,7,8,9]
                        </div>
                        <p className="data-structure-case-content-section">Output:</p>
                        <div className="data-structure-case-content-section-content">
                            target = 321
                        </div>
                    </div>
                </div>

            </div>
        </>
    );
}
