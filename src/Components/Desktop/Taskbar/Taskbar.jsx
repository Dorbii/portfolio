import React from 'react';
import './taskbar.css';
import winIcon from '../../../assets/Desktop/taskbar/windows_icon.png';
import { Button } from '@mui/material';
export default function Taskbar() {
    return (
        <>
            <footer className="taskbar">
                <div className="taskbar-container">
                    <div className="start-icon-container">
                        <div className="start-icon"></div>
                    </div>
                    <div className="app-icons-container">
                    </div>
                </div>
            </footer>
        </>
    );
}