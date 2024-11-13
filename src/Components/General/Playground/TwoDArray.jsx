import "./css/twoDArray.css";
import { useContext } from 'react';
import { DsContext } from './DsContext.jsx';
export default function TwoDArray() {
    const { ds } = useContext(DsContext);
    const arr = []

    return (
        <>
            <div className="array-container">
                {arr.map((row, i) => (
                    <div key={i} className="square">
                        <div className="square-content">
                            {ds.array[i]}
                        </div>
                    </div>))
                }
            </div>
        </>
    );
}