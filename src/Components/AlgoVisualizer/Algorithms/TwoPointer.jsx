import { useContext, useState, useEffect } from 'react';
import { DsContext } from '../../General/Playground/DsContext.jsx';
import TwoDArray from '../../DataStructures/TwoDArray/TwoDArray.jsx';
import { Button } from '@mui/material';

//section helper functions start
const isAlphaNumeric = (str) => {
    return /^[a-z0-9]+$/i.test(str);
}
//section helper functions end

export default function TwoPointer() {
    const { ds } = useContext(DsContext);
    const [getArrowArray, setArrowArray] = useState([]);
    const [getDataArray, setDataArray] = useState([]);
    const [left, setLeft] = useState(1);
    const [right, setRight] = useState(0);
    const [prevLeft, setPrevLeft] = useState(1);
    const [prevRight, setPrevRight] = useState(0);
    const [showReset, setShowReset] = useState();
    const [isPalindrome, setIsPalindrome] = useState(true);


    //section useEffects start
    // *Init data and arrow array
    useEffect(() => {
        if (ds && ds.input) {
            setDataArray(ds.input);
            const newArr = [...ds.input];
            for (let i = 0; i < ds.input.length - 1; i++) {
                if (i === 0 || i === ds.input.length - 1) {
                    newArr[i] = 'visible';
                } else {
                    newArr[i] = 'hidden';
                }
            }
            setArrowArray(newArr);
            setLeft(0);
            setRight(ds.input.length - 1);
        }
    }, [ds]);
    //* Is palindrome logic with react rendering
    useEffect(() => {
        if (left < right) {
            let newLeft = left;
            let newRight = right;
            let oldLeft = prevLeft;
            let oldRight = prevRight;
            if (newLeft < newRight && !isAlphaNumeric(getDataArray[newLeft])) {
                newLeft += 1;
            }
            if (newLeft < newRight && !isAlphaNumeric(getDataArray[newRight])) {
                newRight -= 1;
            }
            if (getDataArray[left].toLowerCase() !== getDataArray[right].toLowerCase()) {
                setIsPalindrome(false);
                setShowReset(true);
                return;
            }
            setLeft(newLeft);
            setRight(newRight);
            setArrowArray(prev => {
                const newArr = [...prev];
                newArr[oldLeft] = 'hidden';
                newArr[oldRight] = 'hidden';
                newArr[newLeft] = 'visible';
                newArr[newRight] = 'visible';
                return newArr;
            });
        } else if (left === right) {
            setShowReset(true);
        }
    }, [getDataArray, left, prevLeft, prevRight, right]);
    //section useEffects end

    //section click handlers start
    const handleClick = () => {
        let newLeft = left + 1;
        let newRight = right - 1;
        setLeft(newLeft);
        setPrevLeft(left);
        setRight(newRight);
        setPrevRight(right);
    }
    const handleReset = () => {
        setLeft(0);
        setRight(ds.input.length - 1);
        setPrevLeft(0);
        setPrevRight(ds.input.length - 1);
        const newArr = [...ds.input];
        for (let i = 0; i < ds.input.length - 1; i++) {
            if (i === 0 || i === ds.input.length - 1) {
                newArr[i] = 'visible';
            } else {
                newArr[i] = 'hidden';
            }
        }
        setArrowArray(newArr);
        setShowReset(false);
    }
    //section click handlers end
    return (
        <>
            <Button onClick={handleClick} >Play</Button>
            <TwoDArray dataArray={getDataArray} arrowArray={getArrowArray} />
            {
                showReset && <Button onClick={handleReset}>Reset</Button>
            }
            {
                showReset && (isPalindrome ?
                    <div>It is a palindrome</div> :
                    <div>It is not a palindrome</div>
                )
            }

        </>
    );
}
