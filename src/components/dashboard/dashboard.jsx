import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

// css
import "./dashboard.css";

// Widgets
import AttorneyWidget from "../widgets/attorney_widget";

// modules
import { verifyToken } from "../../config/reusable_config";

const Dashboard = () => {
    const navigate = useNavigate();
    const { selectedProject, attorneys } = useOutletContext() || {};

    useEffect(() => {
        const checkUser = async () => {
            const userType = await getValue("user_type");
            if (userType !== "admin") {
                const ok = await verifyToken(false);
                if (!ok) {
                    console.log("Token could not be verified");
                    navigate("/landing");
                }
            }
        };
        
        const checkAdmin = async () => {
            const userType = await getValue("user_type");
            if (userType === "admin") {
                const ok = await verifyToken(true);
                if (!ok) {
                    console.log("User is not admin");
                    checkUser();
                }
            }
        };

        checkAdmin();
    }, []);

    return (
        <div className="shortlist-dashboard-main-container">
            <AttorneyWidget attorneys={attorneys} />
        </div>
    );
};


export default Dashboard;