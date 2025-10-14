import React from "react";
import { useNavigate } from "react-router-dom";
import DownloadShortlist from "../downloadshortlist/downloadshortlist.jsx";
import dashboard from "../../../assets/icons/dashboard.png";
import profileuser from "../../../assets/icons/profile-user.png";
import create from "../../../assets/icons/anvil.png";
import shortlistEdit from "../../../assets/icons/edit.png";
import attorneyEdit from "../../../assets/icons/user-edit.png";

import styles from "./sidebar.module.css";

const adminNavLinks = [
    { label: "Client View", path: "/admin/client-view", icon: dashboard, aria: "Client View" },
    { label: "Create Shortlist", path: "/admin/create-shortlist", icon: create, aria: "Create Shortlist" },
    { label: "Upload Images", path: "/admin/upload-images", icon: profileuser, aria: "Upload Images" },
    { label: "Edit Shortlists", path: "/admin/edit-shortlists", icon: shortlistEdit, aria: "Edit Shortlists" },
    { label: "Edit Attorneys", path: "/admin/edit-attorneys", icon: attorneyEdit, aria: "Edit Attorneys" },
    // { label: "Invite Client", path: "/admin/invite-client", icon: null, aria: "Invite Client" },
];

const Sidebar = ({ selectedProject, setSelectedProject, availableProjects = [] }) => {
    const navigate = useNavigate();
    const selectedValue = selectedProject || "";

    const handleLogout = () => {
        try { localStorage.clear(); } catch { }
        navigate("/landing", { replace: true });
    };

    return (
        <aside className={styles.adminSidebar}>
            <div className={styles.section}>
                <h3 className={styles.title}>Current Project</h3>
                <label htmlFor="project-select" className={styles.label}>
                    Choose a project to view
                </label>

                <select
                    id="project-select"
                    className={styles.select}
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

            <hr className={styles.divider} />
            <div className={styles.sectionTitle}>Admin Navigation</div>

            {adminNavLinks.map(({ label, path, icon, aria }, idx) => (
                <button
                    key={idx}
                    type="button"
                    className={styles.link}
                    onClick={() => navigate(path)}
                    aria-label={aria}
                    title={label}
                >
                    {icon && <img className={styles.icon} src={icon} alt="" aria-hidden="true" />}
                    <span>{label}</span>
                </button>
            ))}

            <div style={{ flex: 1 }} />
            <button
                type="button"
                className={`${styles.link} ${styles.logout}`}
                onClick={handleLogout}
                title="Log out"
            >
                Log out
            </button>
        </aside>
    );
};

export default Sidebar;