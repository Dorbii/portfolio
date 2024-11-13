import { createContext, useState } from 'react';

const DsContext = createContext(
    {
        ds: " ",
        updateDS: () => { }
    }
);

const DsProvider = ({ children }) => {
    const [ds, setDS] = useState(null);
    const updateDS = (dsType) => {
        if (dsType === "TP") {
            setDS({ ds: "TP", code: "def two_pointer(nums, target):\n    left = 0\n    right = len(nums) - 1\n    while left < right:\n        if nums[left] + nums[right] == target:\n            return [left, right]\n        elif nums[left] + nums[right] < target:\n            left += 1\n        else:\n            right -= 1\n    return []" });
        } else {
            setDS(" ");
        };
    };
    return (
        <DsContext.Provider value={{ ds, updateDS }}>
            {children}
        </DsContext.Provider>
    );
};
export { DsContext, DsProvider };