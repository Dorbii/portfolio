import "./css/twoDArray.css";
import { useContext, useState, useEffect } from 'react';
import { DsContext } from './DsContext.jsx';
import Grid from '@mui/material/Grid2';
export default function TwoDArray() {
    const { ds } = useContext(DsContext);
    const [getArrowArray, setArrowArray] = useState([]);
    const [arr, setArr] = useState([]);
    useEffect(() => {
        if (ds && ds.input) {
            setArr(ds.input);
            createArrowArray(ds.input);
        }
    }, [ds]);


    const createArrowArray = (arr) => {
        const tmpArr = [];
        for (let i = 0; i < arr.length; i++) {
            tmpArr.push(true);
        }
        setArrowArray([...tmpArr]);
    }
    return (
        <>
            <Grid container rowSpacing={1} columnSpacing={1} direction="column" className="data-structure-visualizer-content">
                <Grid >
                    <Grid container spacing={1} direction="row">
                        {arr.map((_, i) => (
                            <Grid key={`square-${i}`}>
                                <div className="square">
                                    <div className="square-content">
                                        {arr[i]}
                                    </div>
                                </div>
                            </Grid>
                        ))}
                    </Grid>
                </Grid>
                <Grid >
                    <Grid container spacing={1} direction="row">
                        {getArrowArray.map((v, i) => (
                            <Grid key={`pointer-${i}`} hidden={v}>
                                <div className="pointer" >
                                    <i className="material-symbols-outlined" >arrow_upward</i>
                                </div>
                            </Grid>
                        ))}
                    </Grid>
                </Grid>
            </Grid >
        </>
    );
}