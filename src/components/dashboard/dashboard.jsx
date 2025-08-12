import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// css
import "./dashboard.css";

// Widgets
import AttorneyWidget from "../widgets/attorney_widget";
import AdminNav from "../admin/admin_nav";

// modules
import { verifyToken } from "../../config/reusable_config";

const Dashboard = () => {
    const [isAdmin, setIsAdmin] = useState(false);

        const verify = async () => {
            const verified = await verifyToken();
            if (verified) setIsAdmin(true);
        };

    useEffect(() => {
        verify();
    },[]);

    return (
        <div className="shortlist-dashboard-main-container">
            {isAdmin && <AdminNav />}
            <AttorneyWidget />
        </div>
    )

};

export default Dashboard;