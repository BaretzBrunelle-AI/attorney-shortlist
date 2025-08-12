import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// CSS
import "./navbar.css";

// Images
import header from "../../assets/Linkedin Header.jpg";
import download from "../../assets/icons/downloads.png";

// Modules
import { verifyToken } from "../../config/reusable_config.jsx";

// Admin UI component
import AdminNav from "../admin/admin_nav.jsx";

const NavBar = () => {
    const navigate = useNavigate();
    const handleDownloadShortlist = () => {
        // TODO: Implement shortlist download logic
    };

    return (
        <div className="navbar-main-container">
            <div className="navbar-header-image-container">
                <img
                    className="navbar-header-image"
                    alt="navbar-header-image"
                    src={header}
                />
            </div>

            <h2 id="navbar-title" onClick={() => navigate("/dashboard")}>
                Attorney Shortlist
            </h2>

            <div className="navbar-buttons-container">
                <div
                    className="navbar-download-container"
                    onClick={handleDownloadShortlist}
                >
                    <img
                        className="navbar-download-img"
                        alt="Download Current Shortlist"
                        src={download}
                    />
                    Download Shortlist
                </div>
            </div>
        </div>
    );
};

export default NavBar;