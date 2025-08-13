import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// CSS
import "./navbar.css";

// Images
import header from "../../assets/header.jpg";

const NavBar = () => {
    const navigate = useNavigate();

    return (
        <div className="navbar-main-container">
            <div className="navbar-header-image-container">
                <img
                    className="navbar-header-image"
                    alt="navbar-header-image"
                    src={header}
                />
            </div>

            <h2 id="navbar-title" onClick={() => navigate("/client/dashboard")}>
                Attorney Shortlist
            </h2>
        </div>
    );
};

export default NavBar;