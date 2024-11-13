import "./css/twoDArray.css";
import { useContext, useState, useEffect } from 'react';
import { DsContext } from './DsContext.jsx';
export default function TwoDArray() {
    const { ds } = useContext(DsContext);
    const [arr, setArr] = useState([]);
    useEffect(() => {
        if (ds && ds.input) {
            setArr(ds.input);
        }
    }, [ds]);
    return (
        <>
            <div className="array-container">
                {arr.map((row, i) => (
                    <div key={i} className="square">
                        <div className="square-content">
                            {arr[i]}
                        </div>
                    </div>))
                }
            </div>
        </>
    );
}