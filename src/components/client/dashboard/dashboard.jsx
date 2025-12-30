import { useEffect, useState } from "react";
import { useOutletContext, useLocation } from "react-router-dom";

import "./dashboard.css";
import AttorneyWidget from "../attorney_widget/attorney_widget";
import api from "../../../config/axios_config.jsx";
import { getValue } from "../../../config/reusable_config.jsx";

const Dashboard = () => {
    const outletCtx = useOutletContext() || {};
    const { selectedProject, attorneys: ctxAttorneys } = outletCtx;
    const location = useLocation();

    const [sessionProjectName, setSessionProjectName] = useState("");
    const [clientAttorneys, setClientAttorneys] = useState([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    const isAdminRoute = location.pathname.startsWith("/admin");

    // load hydrated projects from the session for client routes only
    useEffect(() => {
        if (isAdminRoute) return;
        if (selectedProject) return;

        let alive = true;

        (async () => {
            try {
                const raw = await getValue("user_projects");
                if (!raw) return;

                const parsed = JSON.parse(raw);
                if (!Array.isArray(parsed) || parsed.length === 0) return;

                const now = Date.now();
                const nonExpired =
                    parsed.find((p) => {
                        if (!p.expires_at) return true;
                        const t = new Date(p.expires_at).getTime();
                        return Number.isFinite(t) && t > now;
                    }) || parsed[0];

                if (!alive) return;
                setSessionProjectName(nonExpired?.project_name || "");
            } catch (e) {
                console.error("[Dashboard] failed to load user_projects", e);
            }
        })();

        return () => {
            alive = false;
        };
    }, [isAdminRoute, selectedProject]);

    // fetch attorneys for the client session (uses jwt from axios interceptor)
    useEffect(() => {
        if (isAdminRoute) return;
        if (!sessionProjectName) return;

        let alive = true;

        (async () => {
            setLoading(true);
            setErr("");
            try {
                const res = await api.get("/dashboard/get-attorneys-user", {
                    admin: false,
                });

                const list = Array.isArray(res.data)
                    ? res.data
                    : res.data?.attorneys ?? [];

                if (!alive) return;
                setClientAttorneys(list);
            } catch (e) {
                if (!alive) return;
                console.error(
                    "[Dashboard] /dashboard/get-attorneys-user failed",
                    e?.response?.data || e.message
                );
                setErr("Failed to load shortlist for this access code");
                setClientAttorneys([]);
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [isAdminRoute, sessionProjectName]);

    // project + attorneys selection:
    // - admin routes: use layout context
    // - client route: use session project + fetched attorneys
    const effectiveProjectName = isAdminRoute
        ? selectedProject || ""
        : sessionProjectName || "";

    const effectiveAttorneys = isAdminRoute
        ? ctxAttorneys || []
        : clientAttorneys || [];

    if (!effectiveProjectName) {
        return (
            <div className="shortlist-dashboard-main-container">
                <div className="shortlist-dashboard-empty">
                    {loading
                        ? "loading shortlist…"
                        : "no active shortlist selected for this session"}
                </div>
            </div>
        );
    }

    if (!isAdminRoute && loading && effectiveAttorneys.length === 0) {
        return (
            <div className="shortlist-dashboard-main-container">
                <div className="shortlist-dashboard-empty">
                    loading shortlist…
                </div>
            </div>
        );
    }

    if (!isAdminRoute && err && effectiveAttorneys.length === 0) {
        return (
            <div className="shortlist-dashboard-main-container">
                <div className="shortlist-dashboard-empty">
                    {err}
                </div>
            </div>
        );
    }

    return (
        <div className="shortlist-dashboard-main-container">
            <AttorneyWidget
                attorneys={effectiveAttorneys}
                project={effectiveProjectName}
            />
        </div>
    );
};

export default Dashboard;