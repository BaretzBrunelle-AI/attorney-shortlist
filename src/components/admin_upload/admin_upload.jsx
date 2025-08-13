import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../config/axios_config.jsx";

import "./admin_upload.css";

const AdminUpload = () => {
    const { selectedProject, setSelectedProject } = useOutletContext() || {};

    const [projectTitle, setProjectTitle] = useState("");
    const [headerTitle, setHeaderTitle] = useState("");
    const [headerSubtitle, setHeaderSubtitle] = useState("");
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState("");

    const [usesVS, setUsesVS] = useState(false);

    const [availableProjects, setAvailableProjects] = useState([]);

    const [missingImages, setMissingImages] = useState([]);
    const [downloading, setDownloading] = useState(false);

    const findProjects = async () => {
        try {
            const response = await api.get("/admin/get-projects", { admin: true });
            if (response.data?.projects) setAvailableProjects(response.data.projects);
        } catch (err) {
            console.error("Error fetching projects:", err);
        }
    };

    useEffect(() => {
        findProjects();
    }, []);

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

        formData.append("uses_vs", String(usesVS));

        try {
            const res = await api.post("/admin/upload-attorneys", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                admin: true,
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
                params: { project_name: project },
                admin: true,
            });
            setMissingImages(response.data?.attorneys || []);
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
                headers: { "Content-Type": "multipart/form-data" },
                admin: true,
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
            }, 3000);
            return true;
        } catch (err) {
            console.error("Upload failed:", err?.response?.data || err.message);
            return false;
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

    const selectedValue = selectedProject && selectedProject !== "Select Project" ? selectedProject : "";

    return (
        <div className="admin-upload-outer-container">
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
                            <div className="upload-input-message">Note: Project title is case sensitive<br/>Used for limiting user access to specified project</div>
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
                            <div className="upload-input-message">Note: Header title and subtitle will display on PDF header</div>
                            <fieldset className="visibility-score-fieldset">
                                <legend>Visibility Score</legend>
                                <label 
                                    id="visibility-score-option" 
                                >
                                    <input
                                        type="radio"
                                        name="uses_vs"
                                        value="false"
                                        checked={!usesVS}
                                        onChange={() => setUsesVS(false)}
                                    />
                                    No visibility score (default)
                                </label>
                                <label 
                                    id="visibility-score-option"
                                >
                                    <input
                                        type="radio"
                                        name="uses_vs"
                                        value="true"
                                        checked={usesVS}
                                        onChange={() => setUsesVS(true)}
                                    />
                                    Show visibility score
                                </label>
                            </fieldset>

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

                        {usesVS && (
                            <p className="helper-text">
                                Make sure your CSV includes a <code>visibility_score</code> column.
                            </p>
                        )}

                        {message && <p className="upload-status">{message}</p>}
                    </div>
                </div>
                <div className="admin-upload-section-two">
                    <div className="upload-attorney-images-container">
                        <div className="section-title">Upload Attorney Images</div> <br />
                        <button
                            className="clear-list"
                            onClick={() => handleClearList()}
                            disabled={selectedProject == "Select Project"}
                        >
                            Clear List
                        </button>
                        <div className="project-select-wrapper">
                            <label htmlFor="project-select">Select Project: </label>
                            <select
                                id="project-select"
                                className="admin-upload-project-select"
                                value={selectedValue}
                                onChange={(e) => handleProjectSelect(e.target.value || "Select Project")}
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
                <div className="admin-upload-section-three">
                    <div className="attorney-shortlist-download-container">
                        <div className="project-select-wrapper">
                            <label htmlFor="project-select">Select Project: </label>
                            <select
                                id="project-select"
                                className="admin-upload-project-select"
                                value={selectedValue}
                                onChange={(e) => handleProjectSelect(e.target.value || "Select Project")}
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminUpload;