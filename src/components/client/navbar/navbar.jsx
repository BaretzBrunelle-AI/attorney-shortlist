import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// CSS
import "./navbar.css";

// Images
import header from "../../../assets/header.jpg";

const Navbar = ({ projectName }) => {
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

            <h1 id="navbar-title" onClick={() => navigate("/client/dashboard")}>
                {projectName}
            </h1>
        </div>
    );
};

export default Navbar;