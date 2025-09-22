import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../../config/axios_config.jsx";

import "./createshortlist.css";

const CreateShortlist = () => {
    const { selectedProject } = useOutletContext() || {};
    const [projectTitle, setProjectTitle] = useState("");
    const [headerTitle, setHeaderTitle] = useState("");
    const [headerSubtitle, setHeaderSubtitle] = useState("");
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState("");
    const [usesVS, setUsesVS] = useState(false);

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
            setProjectTitle("");
            setHeaderTitle("");
            setHeaderSubtitle("");
            setUsesVS("");
            setFile(null);
        } catch (err) {
            console.error(err);
            setMessage("Failed to upload: " + (err?.response?.data || "Server error"));
        }
    };

    return (
        <div className="create-shortlist-main-container">
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
                    <div className="upload-input-message">
                        Note: Project title is case sensitive<br />Used for limiting user access to specified project
                    </div>

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
                    <div className="upload-input-message">
                        Note: Header title and subtitle will display on PDF header
                    </div>

                    <div className="visibility-score-fieldset">
                        <div className="fieldset-label">Visibility Score</div>
                        <label id="visibility-score-option">
                            <input
                                type="radio"
                                name="uses_vs"
                                value="false"
                                checked={!usesVS}
                                onChange={() => setUsesVS(false)}
                            />
                            No visibility score (default)
                        </label>
                        <label id="visibility-score-option">
                            <input
                                type="radio"
                                name="uses_vs"
                                value="true"
                                checked={usesVS}
                                onChange={() => setUsesVS(true)}
                            />
                            Show visibility score
                        </label>
                        <div className="helper-text">
                            {(usesVS || false ) ? (
                                <>Make sure your CSV includes a "<code>visibility_score</code>" column.</>
                            ) : (
                                <>NOT USING VISIBILITY SCORE</>
                            )}
                        </div>
                    </div>

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
                {message && <div className="upload-status">{message}</div>}
            </div>
        </div>
    );
};

export default CreateShortlist;