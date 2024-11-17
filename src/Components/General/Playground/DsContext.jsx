import { createContext, useState } from 'react';

const DsContext = createContext(
    {
        ds: " ",
        updateDS: () => { }
    }
);

const DsProvider = ({ children }) => {
    const [ds, setDS] = useState(null);

    const updateParams = (i) => {
        const input = [...i];
        setDS({ ...ds, input: input });
    };

    const updateDS = (dsType) => {
        if (dsType === "TP") {
            setDS({
                ds: "TP",
                code: "def isPalindrome(self, s: str) -> bool:\n\tleft = 0\n\tright = len(s) - 1\n\twhile left < right:\n\t\twhile left < right and not s[left].isalnum():\n\t\t\tleft += 1\n\t\twhile left < right and not s[right].isalnum():\n\t\t\tright -= 1\n\t\tif s[left].lower() != s[right].lower():\n\t\t\treturn False\n\t\tleft += 1\n\t\tright -= 1\n\treturn True",
                input: []
            });
        } else {
            setDS({
                ds: "",
                code: "",
                input: []
            });
        };
    };
    return (
        <DsContext.Provider value={{ ds, updateDS, updateParams }}>
            {children}
        </DsContext.Provider>
    );
};
export { DsContext, DsProvider };