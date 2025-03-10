import React from 'react';
import './taskbar.css';
import winIcon from '../../../assets/Desktop/taskbar/windows_icon.png';
import { Button } from '@mui/material';
export default function Taskbar() {
    return (
        <>
            <footer className="taskbar">
                <div class="taskbar-container">
                    <div class="start-icon-container">
                        <div class="start-icon"></div>
                    </div>
                    <div class="app-icons-container">
                    </div>
                </div>
            </footer>
        </>
    );
}