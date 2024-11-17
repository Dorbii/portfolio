import "./css/twoDArray.css";

import Grid from '@mui/material/Grid2';


export default function TwoDArray({ dataArray, arrowArray, }) {
    return (
        <>
            <Grid container rowSpacing={1} columnSpacing={1} direction="column" className="data-structure-visualizer-content">
                <Grid >
                    <Grid container spacing={1} direction="row" flexWrap={"nowrap"} >
                        {dataArray.map((_, i) => (
                            <Grid key={`square-${i}`}>
                                <div className="square">
                                    <div className="square-content">
                                        {dataArray[i]}
                                    </div>
                                </div>
                            </Grid>
                        ))}
                    </Grid>
                </Grid>
                <Grid >
                    <Grid container spacing={1} direction="row" flexWrap={"nowrap"}>
                        {arrowArray.map((v, i) => (
                            <Grid key={`pointer-${i}`} visibility={v}>
                                <div className="pointer"  >
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