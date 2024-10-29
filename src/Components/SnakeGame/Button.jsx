import './css/Button.css';
const Button = ({ onUp, onDown, onLeft, onRight }) => {
    return (
        <div className='button-container'>
            <div className='upwards'>
                <input type='button' value='UP' onClick={onUp} className="up" />
            </div>
            <div className='left-right'>
                <input type='button' value='LEFT' onClick={onLeft} className="left" />
                <input type='button' value='RIGHT' onClick={onRight} className="right" />
            </div>
            <div className='downwards'>
                <input type='button' value='DOWN' onClick={onDown} className="down" />
            </div>
        </div>
    )
}
export default Button;