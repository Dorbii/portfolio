import { BsChevronUp } from "react-icons/bs";
import './css/playgroundFooter.css';

export default function PlaygroundFooter({ handleSubmit }) {
    return (
        <div className='playground-footer'>
            <div className='playground-footer-inner'>
                <div className='playground-footer-left'>
                    <button className='playground-footer-button playground-footer-button-console'>
                        Console
                        <div className='playground-footer-icon'>
                            <BsChevronUp className='playground-footer-icon-chevron' />
                        </div>
                    </button>
                </div>
                <div className='playground-footer-right'>
                    <button
                        className='playground-footer-button-run'
                        onClick={handleSubmit}
                    >
                        Run
                    </button>
                    <button
                        className='playground-footer-button-submit'
                        onClick={handleSubmit}
                    >
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
}