import { createContext, useState } from 'react';

const DsContext = createContext(
    {
        ds: " ",
        updateDS: () => { }
    }
);

const DsProvider = ({ children }) => {
    const [ds, setDS] = useState(null);

    const updateParams = (i, t) => {
        const substr = i.substring(1, i.length - 1);
        const input = substr.split(",");
        for (let j = 0; j < input.length; j++) {
            input[j] = parseInt(input[j]);
        }
        setDS({ ...ds, input: input, target: parseInt(t) });
    };

    const updateDS = (dsType) => {
        if (dsType === "TP") {
            setDS({
                ds: "TP",
                code: "def two_pointer(array, target):\n\tleft = 0\n\tright = len(array) - 1\n\twhile left < right:\n\t\tif array[left] + array[right] == target:\n\t\t\treturn [left, right]\n\t\telif array[left] + array[right] < target:\n\t\t\tleft += 1\n\t\telse:\n\t\t\tright -= 1\n\treturn []",
                input: [],
                target: -1
            });
        } else {
            setDS({
                ds: "",
                code: "",
                input: [],
                target: -1
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