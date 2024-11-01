import './css/PreferenceNav.css';
import { AiOutlineSetting } from "react-icons/ai";
export default function PreferenceNav() {

    return (
        <>
            <div className="preference-nav">
                <div className="preference-nav-item">
                    <button className='preference-nav-item-lang'>JavaScript</button>
                </div>

                <div className="preference-nav-item">
                    <button className="preference-nav-item-settings">
                        <AiOutlineSetting />
                    </button>
                </div>
            </div>
        </>
    );
}
