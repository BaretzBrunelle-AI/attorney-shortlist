// src/components/client/layout/layout.jsx
import React, { useEffect, useState } from "react";
import { Outlet, Navigate } from "react-router-dom";

import NavBar from "../navbar/navbar.jsx";
import { verifyAccess } from "../../../config/reusable_config.jsx";

import "./layout.css";

const ClientLayout = () => {
    const [isUserVerified, setIsUserVerified] = useState(false);
    const [checkedUser, setCheckedUser] = useState(false);

    useEffect(() => {
        let alive = true;

        const checkUser = async () => {
            const verified = await verifyAccess();
            if (!alive) return;
            setIsUserVerified(verified);
            setCheckedUser(true);
        };

        checkUser();

        return () => {
            alive = false;
        };
    }, []);

    if (!checkedUser) return null;

    if (!isUserVerified) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="client-dashboard-layout">
            <div className="client-dashboard-body">
                <NavBar />
                <div className="client-layout-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default ClientLayout;