import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyToken } from "../../config/reusable_config.jsx";
import api from "../../config/axios_config.jsx";

import "./admin_upload.css";

// components
import AdminNav from "../admin/admin_nav.jsx";

const AdminUpload = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isAdmin = searchParams.get("isAdmin") === "true";

    const [projectTitle, setProjectTitle] = useState("");
    const [headerTitle, setHeaderTitle] = useState("");
    const [headerSubtitle, setHeaderSubtitle] = useState("");
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState("");

    const [selectedProject, setSelectedProject] = useState("Select Project");
    const [availableProjects, setAvailableProjects] = useState([]);

    const [missingImages, setMissingImages] = useState([]);

    const verify = async () => {
        const verified = await verifyToken();
        if (!verified) {
            console.log("Token could not be verified");
            navigate("/dashboard");
        }
    };

    const findProjects = async () => {
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

    useEffect(() => {
        if (isAdmin) {
            verify();
        } else {
            navigate("/dashboard");
        }
    }, []);

    useEffect(() => {
        findProjects();
    },[]);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !projectTitle) {
            setMessage("Please provide both a project title and a CSV file.");
            return;
        }

        const formData = new FormData();
        formData.append("project_title", projectTitle);
        formData.append("file", file);
        formData.append("header_title", headerTitle);
        formData.append("header_subtitle", headerSubtitle);

        try {
            const res = await api.post("/admin/upload-attorneys", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });
            setMessage(res.data || "Upload successful");
        } catch (err) {
            console.error(err);
            setMessage("Failed to upload: " + (err?.response?.data || "Server error"));
        }
    };

    const handleProjectSelect = async (project) => {
        setSelectedProject(project);
        await checkImages(project);
    };

    const checkImages = async (project) => {
        try {
            const response = await api.get("/admin/check-images", {
                params: { project_name: project }
            });
            if (response.data?.attorneys) {
                setMissingImages(response.data.attorneys);
            } else {
                setMissingImages([]);
            }
        } catch (err) {
            console.error("Failed to check images:", err);
            setMissingImages([]);
        }
    };

    const handleClearList = async () => {
        setMissingImages([]);
        handleProjectSelect("Select Project");
    };

    const handleUploadImage = async (attorneyId, file) => {
        const formData = new FormData();
        formData.append("attorney_id", attorneyId);
        formData.append("file", file);

        try {
            const response = await api.post("/admin/upload-attorney-image", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });
            console.log("Upload success:", response.data);
            setMissingImages((prev) =>
                prev.map((attorney) =>
                    attorney.attorney_id === attorneyId
                        ? { ...attorney, name: "SUCCESS" }
                        : attorney
                )
            );

            setTimeout(() => {
                setMissingImages((prev) =>
                    prev.filter((attorney) => attorney.attorney_id !== attorneyId)
                );
            }, 3000); // 3 seconds
            return true;
        } catch (err) {
            console.error("Upload failed:", err?.response?.data || err.message);
            return false;
        }
    };

    return (
        <div className="admin-upload-outer-container">
            <div className="admin-nav-sub-container">
                {isAdmin && (
                    <AdminNav
                        selectedProject={selectedProject}
                        setSelectedProject={handleProjectSelect}
                    />
                )}
            </div>
            <div className="admin-upload-main-container">
                <div className="admin-upload-section-one">
                    <div className="upload-new-shortlist-container">
                        <div className="section-title">Upload New Shortlist Project</div>
                        <form onSubmit={handleUpload} className="admin-upload-attorney-forms">
                            <label>
                                Project Title:
                                <input
                                    id="project-name-input-field"
                                    type="text"
                                    placeholder="Enter Project Name"
                                    value={projectTitle}
                                    onChange={(e) => setProjectTitle(e.target.value)}
                                    required
                                />
                            </label>
                            <label>
                                Header Title:
                                <input
                                    id="project-header-title-input-field"
                                    type="text"
                                    placeholder="Enter Header Title"
                                    value={headerTitle}
                                    onChange={(e) => setHeaderTitle(e.target.value)}
                                />
                            </label>

                            <label>
                                Header Subtitle:
                                <input
                                    id="project-header-subtitle-input-field"
                                    type="text"
                                    placeholder="Enter Header Subtitle"
                                    value={headerSubtitle}
                                    onChange={(e) => setHeaderSubtitle(e.target.value)}
                                />
                            </label>
                            <label>
                                CSV File:
                                <input
                                    id="attorney-file-input-field"
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setFile(e.target.files[0])}
                                    required
                                />
                            </label>
                            <button id="upload-submit-button" type="submit">Upload</button>
                        </form>
                        {message && <p className="upload-status">{message}</p>}
                    </div>
                    <div className="upload-attorney-images-container">
                        <div className="section-title">Upload Attorney Images</div> <br/>
                        <button
                            className="clear-list"
                            onClick={() => handleClearList()}
                            disabled={selectedProject == "Select Project"}
                        >
                            Clear List
                        </button>
                        <div className="project-dropdown-wrapper">
                            <div className="select-project">
                                {selectedProject || "Select Project"}
                            </div>

                            <div className="upload-find-projects-dropdown">
                                {availableProjects.length > 0 ? (
                                    availableProjects.map((project, idx) => (
                                        <div
                                            key={idx}
                                            className="upload-find-projects-item"
                                            onClick={() => handleProjectSelect(project)}
                                        >
                                            {project}
                                        </div>
                                    ))
                                ) : (
                                    <div className="upload-find-projects-item">No projects found</div>
                                )}
                            </div>
                        </div>
                        {missingImages.length > 0 && (
                            <div className="attorney-image-upload-list">
                                <br />
                                {missingImages.map((attorney) => (
                                    <form
                                        key={attorney.attorney_id}
                                        className="attorney-image-upload-form"
                                        onSubmit={async (e) => {
                                            e.preventDefault();
                                            const file = e.target.elements[`image-${attorney.attorney_id}`].files[0];
                                            if (file) {
                                                await handleUploadImage(attorney.attorney_id, file);
                                            }
                                        }}
                                    >
                                        <label>
                                            {attorney.name}
                                            <input
                                                type="file"
                                                name={`image-${attorney.attorney_id}`}
                                                accept="image/*"
                                                required
                                            />
                                        </label>
                                        <button type="submit">Upload</button>
                                    </form>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="admin-upload-section-two">

                </div>
            </div>
        </div>
    );
};

export default AdminUpload;