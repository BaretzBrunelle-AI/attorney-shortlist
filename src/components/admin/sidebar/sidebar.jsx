import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, useOutletContext } from "react-router-dom";

import DownloadShortlist from "../downloadshortlist/downloadshortlist.jsx";
import api from "../../../config/axios_config.jsx";

import dashboard from "../../../assets/icons/dashboard.png";
import profileuser from "../../../assets/icons/profile-user.png";
import create from "../../../assets/icons/edit.png";

// Styles
import "./sidebar.css";

const adminNavLinks = [
    {
        label: "Client View",
        path: "/admin/client-view",
        icon: dashboard,
        aria: "Client View"
    },
    {
        label: "Create Shortlist",
        path: "/admin/create-shortlist",
        icon: create,
        aria: "Create Shortlist"
    },
    {
        label: "Upload Images",
        path: "/admin/upload-images",
        icon: profileuser,
        aria: "Upload Images"
    }
];

const Sidebar = ({ selectedProject, setSelectedProject, onAttorneysLoaded, availableProjects = [], setAvailableProjects }) => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (selectedProject && selectedProject !== "Select Project") {
            fetchAttorneysForProject(selectedProject);
        }
    }, [selectedProject]);

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
                <h3 className="admin-sidebar-title">Current Project</h3>

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

            <DownloadShortlist selectedProject={selectedProject} />

            <div className="admin-sidebar-divider" />

            <div className="admin-section-title">Admin Navigation</div>

            {adminNavLinks.map(({ label, path, icon, aria }, idx) => (
                <button
                    key={idx}
                    type="button"
                    className="admin-sidebar-link"
                    onClick={() => navigate(path)}
                    aria-label={aria}
                    title={label}
                >
                    <img
                        className="admin-sidebar-icon"
                        src={icon}
                        alt=""
                        aria-hidden="true"
                    />
                    <span>{label}</span>
                </button>
            ))}

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

export default Sidebar;
