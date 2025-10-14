import { useEffect, useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../../config/axios_config.jsx";
import styles from "./createshortlist.module.css";

const CreateShortlist = () => {
    const { refresh, setSelectedProject } = useOutletContext() || {};
    const [projectTitle, setProjectTitle] = useState("");
    const [headerTitle, setHeaderTitle] = useState("");
    const [headerSubtitle, setHeaderSubtitle] = useState("");
    const [usesVS, setUsesVS] = useState(false);

    const [file, setFile] = useState(null);
    const fileInputRef = useRef(null);

    const [message, setMessage] = useState("");

    // NEW: track title availability state
    const [titleStatus, setTitleStatus] = useState({ state: "idle", msg: "" });
    const isChecking = titleStatus.state === "checking";
    const isTaken = titleStatus.state === "taken";
    const hasError = titleStatus.state === "error";
    const canSubmit =
        !!file &&
        !!projectTitle.trim() &&
        !isChecking &&
        !isTaken &&
        !hasError;

    const checkTitleAvailability = async () => {
        const title = projectTitle.trim();
        if (!title) {
            setTitleStatus({ state: "idle", msg: "" });
            return false;
        }
        try {
            setTitleStatus({ state: "checking", msg: "Checking title…" });
            const { data } = await api.get("/admin/shortlist/check-title", {
                params: { project_title: title },
                admin: true,
            });

            // be tolerant to possible response shapes
            const exists =
                data?.exists ?? data?.taken ?? (typeof data === "boolean" ? data : false);

            if (exists) {
                setTitleStatus({
                    state: "taken",
                    msg: "This project title is already in use.",
                });
                return false;
            } else {
                setTitleStatus({ state: "ok", msg: "Title is available." });
                return true;
            }
        } catch (e) {
            console.error(e);
            setTitleStatus({
                state: "error",
                msg: "Could not verify title right now.",
            });
            return false;
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !projectTitle) {
            setMessage("Please provide both a project title and a CSV file.");
            return;
        }

        // Re-check right before upload
        const ok = await checkTitleAvailability();
        if (!ok) {
            setMessage("Please choose a different project title.");
            return;
        }

        const formData = new FormData();
        formData.append("project_title", projectTitle);
        formData.append("file", file);
        formData.append("header_title", headerTitle);
        formData.append("header_subtitle", headerSubtitle);
        formData.append("uses_vs", String(usesVS));

        try {
            const res = await api.post("/admin/shortlist/create-shortlist", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                admin: true,
            });

            await refresh?.();
            setSelectedProject?.(projectTitle);

            setMessage(res.data || "Upload successful");
            setProjectTitle("");
            setHeaderTitle("");
            setHeaderSubtitle("");
            setUsesVS(false);
            setFile(null);
            setTitleStatus({ state: "idle", msg: "" });
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (err) {
            console.error(err);
            setMessage("Failed to upload: " + (err?.response?.data || "Server error"));
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.sectionTitle}>Upload New Shortlist Project</div>

                <form onSubmit={handleUpload} className={styles.form}>
                    <label>
                        Project Title:
                        <input
                            className={`${styles.textInput} ${isTaken || hasError ? styles.invalid : ""
                                }`}
                            type="text"
                            placeholder="Enter Project Name"
                            value={projectTitle}
                            onChange={(e) => {
                                setProjectTitle(e.target.value);
                                // reset status while typing
                                setTitleStatus({ state: "idle", msg: "" });
                            }}
                            onBlur={checkTitleAvailability}
                            required
                        />
                    </label>

                    <div className={styles.helper} aria-live="polite">
                        Note: Project title is case sensitive.
                        <br />
                        Used for limiting user access to the specified project.
                        {titleStatus.msg ? (
                            <div
                                style={{
                                    marginTop: 6,
                                    color: isTaken || hasError ? "#ef4444" : "#93c5fd",
                                    fontWeight: 600,
                                }}
                            >
                                {titleStatus.msg}
                            </div>
                        ) : null}
                    </div>

                    <label>
                        Header Title:
                        <input
                            className={styles.textInput}
                            type="text"
                            placeholder="Enter Header Title"
                            value={headerTitle}
                            onChange={(e) => setHeaderTitle(e.target.value)}
                        />
                    </label>

                    <label>
                        Header Subtitle:
                        <input
                            className={styles.textInput}
                            type="text"
                            placeholder="Enter Header Subtitle"
                            value={headerSubtitle}
                            onChange={(e) => setHeaderSubtitle(e.target.value)}
                        />
                    </label>

                    <div className={styles.helper}>
                        Note: Header title and subtitle will display on the PDF header.
                    </div>

                    <div className={styles.fieldset}>
                        <div className={styles.fieldsetLabel}>Visibility Score</div>

                        <label className={styles.radioOption}>
                            <input
                                type="radio"
                                name="uses_vs"
                                value="false"
                                checked={!usesVS}
                                onChange={() => setUsesVS(false)}
                            />
                            No visibility score (default)
                        </label>

                        <label className={styles.radioOption}>
                            <input
                                type="radio"
                                name="uses_vs"
                                value="true"
                                checked={usesVS}
                                onChange={() => setUsesVS(true)}
                            />
                            Show visibility score
                        </label>

                        <div className={styles.helper}>
                            {usesVS ? (
                                <>Make sure your CSV includes a <code>visibility_score</code> column.</>
                            ) : (
                                <>Not using visibility score.</>
                            )}
                        </div>
                    </div>

                    <label>
                        CSV File:
                        <input
                            ref={fileInputRef}
                            className={`${styles.textInput} ${styles.fileInput}`}
                            type="file"
                            accept=".csv"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            required
                        />
                    </label>

                    <button className={styles.primaryBtn} type="submit" disabled={!canSubmit}>
                        {isChecking ? "Checking…" : "Upload"}
                    </button>
                </form>

                <div className={styles.status}>{message}</div>
            </div>
        </div>
    );
};

export default CreateShortlist;