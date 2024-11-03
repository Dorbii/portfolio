import './css/testcases.css';
export default function TestCases() {

    return (
        <>
            <div className="test-cases-header-container">
                <div className="test-cases-header-items">
                    <div className="test-cases-header-content">Test Cases</div>
                    <hr className="test-cases-header-hr" />
                </div>
            </div>
            <div className="test-cases-case-container">
                <div className="test-cases-case">
                    <div className="test-cases-case-selection">
                        <div className="test-cases-case-selection-title">
                            Case 1
                        </div>
                        <div className="test-cases-case-selection-title">
                            Case 2
                        </div>
                        <div className="test-cases-case-selection-title">
                            Case 3
                        </div>
                    </div>
                    <div className="test-cases-case-content">
                        <p className="test-cases-case-content-section">Input:</p>
                        <div className="test-cases-case-content-section-content">
                            nums = [123], target = 321
                        </div>
                        <p className="test-cases-case-content-section">Output:</p>
                        <div className="test-cases-case-content-section-content">
                            target = 321
                        </div>
                    </div>
                </div>

            </div>
        </>
    );
}
