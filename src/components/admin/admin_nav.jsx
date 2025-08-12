import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../config/axios_config.jsx";
import dashboard from "../../assets/icons/dashboard.png";

// Styles
import "./admin_nav.css";

const AdminNav = ({ selectedProject, setSelectedProject }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const [availableProjects, setAvailableProjects] = useState([]);
    const [localProject, setLocalProject] = useState("Select Project");

    const onUploadPage = location.pathname === "/admin/upload";

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await api.get("/admin/get-projects");
                if (response.data?.projects) {
                    setAvailableProjects(response.data.projects);
                } else {
                    console.error("Failed to fetch projects");
                }
            } catch (err) {
                console.error("Error fetching projects:", err);
            }
        };

        fetchProjects();
    }, []);

    const handleProjectSelect = (project) => {
        if (onUploadPage) {
            setSelectedProject(project);
        } else {
            setLocalProject(project);
        }
    };

    const displayProject = onUploadPage ? selectedProject : localProject;

    return (
        <div className="navbar-admin-buttons-container">
            <div className="navbar-project-selection-container">
                <div className="navbar-project-hover-wrapper">
                    <div className="navbar-admin-project-nav-closed">
                        {displayProject}
                    </div>
                    <div className="navbar-project-dropdown">
                        {availableProjects.length > 0 ? (
                            availableProjects.map((project, idx) => (
                                <div
                                    key={idx}
                                    className="navbar-project-item"
                                    onClick={() => handleProjectSelect(project)}
                                >
                                    {project}
                                </div>
                            ))
                        ) : (
                            <div className="navbar-project-item">No projects found</div>
                        )}
                    </div>
                </div>
            </div>

            <div
                className="navbar-admin-upload-container"
                onClick={() => navigate("/admin/upload?isAdmin=true")}
            >
                <img
                    className="navbar-download-img"
                    alt="Upload Shortlist Project"
                    src={dashboard}
                />
                Admin Dashboard
            </div>
        </div>
    );
};

export default AdminNav;