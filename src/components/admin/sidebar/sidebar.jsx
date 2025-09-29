// admin/sidebar/sidebar.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import DownloadShortlist from "../downloadshortlist/downloadshortlist.jsx";
import dashboard from "../../../assets/icons/dashboard.png";
import profileuser from "../../../assets/icons/profile-user.png";
import create from "../../../assets/icons/edit.png";
import "./sidebar.css";

const adminNavLinks = [
    { label: "Client View", path: "/admin/client-view", icon: dashboard, aria: "Client View" },
    { label: "Create Shortlist", path: "/admin/create-shortlist", icon: create, aria: "Create Shortlist" },
    { label: "Upload Images", path: "/admin/upload-images", icon: profileuser, aria: "Upload Images" },
];

const Sidebar = ({ selectedProject, setSelectedProject, availableProjects = [] }) => {
    const navigate = useNavigate();
    const selectedValue = selectedProject || "";

    const handleLogout = () => {
        try { localStorage.clear(); } catch (e) { console.error("Failed to clear storage:", e); }
        navigate("/landing", { replace: true });
    };

    return (
        <aside className="admin-sidebar">
            <div className="admin-sidebar-section">
                <h3 className="admin-sidebar-title">Current Project</h3>
                <label htmlFor="project-select" className="admin-sidebar-label">Choose a project to view</label>
                <select
                    id="project-select"
                    className="admin-sidebar-select"
                    value={selectedValue}
                    onChange={(e) => setSelectedProject(e.target.value)}
                >
                    <option value="" disabled>Select Project</option>
                    {availableProjects.length > 0
                        ? availableProjects.map((project, idx) => (
                            <option key={idx} value={project}>{project}</option>
                        ))
                        : <option value="" disabled>No projects found</option>}
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
                    <img className="admin-sidebar-icon" src={icon} alt="" aria-hidden="true" />
                    <span>{label}</span>
                </button>
            ))}

            <div style={{ flex: 1 }} />
            <button type="button" className="admin-sidebar-link logout" onClick={handleLogout} title="Log out">
                Log out
            </button>
        </aside>
    );
};

export default Sidebar;