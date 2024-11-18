//import { BsChevronUp } from "react-icons/bs";
import './css/playgroundFooter.css';

export default function PlaygroundFooter({ handleSubmit }) {
    return (
        <div className='playground-footer'>
            <div className='playground-footer-inner'>
                <div className='playground-footer-left'>
                </div>
                <div className='playground-footer-right'>
                    <button
                        className='playground-footer-button-submit'
                        onClick={handleSubmit}>
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
}