import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../config/axios_config.jsx";

import dashboard from "../../assets/icons/dashboard.png";

// Styles
import "./admin_nav.css";

const AdminNav = ({ selectedProject, setSelectedProject, onAttorneysLoaded }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const [availableProjects, setAvailableProjects] = useState([]);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await api.get("/admin/get-projects", { admin: true });
                if (response.data?.projects)
                    setAvailableProjects(response.data.projects);
            } catch (err) {
                console.error("Error fetching projects:", err);
            }
        };
        fetchProjects();

    }, []);

    const fetchAttorneysForProject = async (project) => {
        try {
            const res = await api.get("/dashboard/get-attorneys-admin", {
                params: { project_name: project },
                admin: true,
            });
            const list = Array.isArray(res.data) ? res.data : (res.data?.attorneys ?? []);
            if (onAttorneysLoaded) onAttorneysLoaded(list);
        } catch (err) {
            console.error(
                "Failed to fetch attorneys for project:",
                err?.response?.data || err.message
            );
        }
    };

    const handleProjectSelect = (project) => {
        setSelectedProject(project);
        if (project && project !== "Select Project") {
            fetchAttorneysForProject(project);
        } else {
            onAttorneysLoaded?.([]);
        }
    };

    const handleDownloadShortlist = async () => {
        if (!selectedProject || downloading) return;
        setDownloading(true);
        try {
            const project = selectedProject;
            if (!project) return;
            const res = await api.post("/dashboard/download-shortlist",
                {
                    project_title: project
                },
                {
                    responseType: "arraybuffer",
                    admin: true
                }
            );

            const type = res.headers["content-type"] || "application/pdf";
            const blob = new Blob([res.data], { type });

            let filename = `${project.replace(/\s+/g, "_")}_attorneys.pdf`;
            const dispo = res.headers["content-disposition"];
            const m = dispo && /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(dispo);
            if (m && m[1]) filename = decodeURIComponent(m[1]);

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Error downloading shortlist:", err);
            alert("Failed to download shortlist. Please try again.");
        } finally {
            setDownloading(false);
        }
    };

    const handleLogout = () => {
        try {
            localStorage.clear();
        } catch (e) {
            console.error("Failed to clear storage:", e);
        } finally {
            navigate("/landing", { replace: true });
        }
    };

    const selectedValue = selectedProject && selectedProject !== "Select Project" ? selectedProject : "";

    return (
        <aside className="admin-sidebar">
            <div className="admin-sidebar-section">
                <h3 className="admin-sidebar-title">Project</h3>

                <label htmlFor="project-select" className="admin-sidebar-label">
                    Choose a project to view
                </label>

                <select
                    id="project-select"
                    className="admin-sidebar-select"
                    value={selectedValue}
                    onChange={(e) => handleProjectSelect(e.target.value)}
                >
                    <option value="" disabled>
                        Select Project
                    </option>
                    {availableProjects.length > 0 ? (
                        availableProjects.map((project, idx) => (
                            <option key={idx} value={project}>
                                {project}
                            </option>
                        ))
                    ) : (
                        <option value="" disabled>
                            No projects found
                        </option>
                    )}
                </select>
            </div>
            <button
                type="button"
                className="admin-sidebar-link"
                onClick={handleDownloadShortlist}
                disabled={!selectedValue || downloading}
                aria-busy={downloading}
            >
                {downloading ? <span className="spinner" aria-hidden="true" /> : "Download Project Shortlist"}
            </button>


            <div className="admin-sidebar-divider" />

            <button
                type="button"
                className="admin-sidebar-link"
                onClick={() => navigate("/client/dashboard")}
                aria-label="Open User Dashboard"
                title="User Dashboard"
            >
                <img
                    className="admin-sidebar-icon"
                    alt=""
                    src={dashboard}
                    aria-hidden="true"
                />
                <span>User Dashboard</span>
            </button>

            <button
                type="button"
                className="admin-sidebar-link"
                onClick={() => navigate("/client/admin/dashboard")}
                aria-label="Open Admin Dashboard"
                title="Admin Dashboard"
            >
                <img
                    className="admin-sidebar-icon"
                    alt=""
                    src={dashboard}
                    aria-hidden="true"
                />
                <span>Admin Dashboard</span>
            </button>

            <div style={{ flex: 1 }} />

            <button
                type="button"
                className="admin-sidebar-link logout"
                onClick={handleLogout}
                title="Log out"
            >
                Log out
            </button>
        </aside>
    );
};

export default AdminNav;
