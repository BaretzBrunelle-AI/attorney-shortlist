import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

// css
import "./dashboard.css";

// Widgets
import AttorneyWidget from "../widgets/attorney_widget";

// modules
import { verifyToken } from "../../config/reusable_config";

const Dashboard = () => {
    const { selectedProject, attorneys } = useOutletContext() || {};
    return (
        <div className="shortlist-dashboard-main-container">
            <AttorneyWidget attorneys={attorneys} />
        </div>
    );
};


export default Dashboard;