import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

// css
import "./dashboard.css";

// Widgets
import AttorneyWidget from "../attorney_widget/attorney_widget";

// reusable
import { verifyToken, getValue } from "../../../config/reusable_config";

const Dashboard = () => {
    const navigate = useNavigate();
    const { selectedProject, attorneys } = useOutletContext() || {};
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            const type = await getValue("user_type");

            if (!type) {
                navigate("/landing", { replace: true });
                return;
            }

            if (type === "admin") {
                const okAdmin = await verifyToken(true);
                if (!okAdmin) {
                    const okUser = await verifyToken(false);
                    if (!okUser) {
                        navigate("/landing", { replace: true });
                        return;
                    }
                }
            } else {
                const okUser = await verifyToken(false);
                if (!okUser) {
                    navigate("/landing", { replace: true });
                    return;
                }
            }

            if (alive) setChecked(true);
        })();
        return () => { alive = false; };
    }, [navigate]);

    return (
        <div className="shortlist-dashboard-main-container">
            <AttorneyWidget attorneys={attorneys} project={selectedProject}/>
        </div>
    );
};


export default Dashboard;