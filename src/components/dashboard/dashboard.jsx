import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// css
import "./dashboard.css";

// Widgets
import AttorneyModule from "../modules/attorney_mod";
import NavBar from "../navbar/navbar";
import AttorneyWidget from "../widgets/attorney_widget";

const Dashboard = () => {

    return (
        <div className="shortlist-dashboard-main-container">
            <NavBar />
            <AttorneyWidget />
        </div>
    )

};

export default Dashboard;