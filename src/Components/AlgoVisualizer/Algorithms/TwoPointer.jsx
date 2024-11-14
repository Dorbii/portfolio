import { useContext, useState, useEffect } from 'react';
import { DsContext } from '../../General/Playground/DsContext.jsx';
import Grid from '@mui/material/Grid';

export default function TwoPointer() {
    const { ds } = useContext(DsContext);
    const [getLArrowIndex, setLArrowIndex] = useState(0);
    const [getRArrowIndex, setRArrowIndex] = useState(0);

    const isAlphaNumeric = (str) => {
        return /^[a-z0-9]+$/i.test(str);
    }
    const isPalindrome = (s) => {
        let left = 0;
        setLArrowIndex(left);
        let right = s.length - 1;
        setRArrowIndex(right);
        while (left < right) {
            while (left < right && !isAlphaNumeric(s[left])) {
                left += 1;
                setLArrowIndex(left);
            }
            while (left < right && !isAlphaNumeric(s[right])) {
                right -= 1;
                setRArrowIndex(right);
            }
            if (s[left].toLowerCase() !== s[right].toLowerCase()) {
                return false;
            }
            left += 1;
            setLArrowIndex(left);
            right -= 1;
            setRArrowIndex(right);
        }
        return true;
    }
    return (
        <>

        </>
    );
}
