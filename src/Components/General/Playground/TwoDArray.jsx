import "./css/twoDArray.css";
import { useContext } from 'react';
import { dsContext } from './DsContext.js';
export default function TwoDArray() {
    const { getCode } = useContext(dsContext);
    if (!getCode || !getCode.array) {
        return <div>Loading...</div>;
    }
    return (
        <>
            <div className="array-container">
                {getCode.array.map((row, i) => (
                    <div key={i} className="square">
                        <div className="square-content">
                            {getCode.array[i]}
                        </div>
                    </div>))
                }
            </div>
        </>
    );
}