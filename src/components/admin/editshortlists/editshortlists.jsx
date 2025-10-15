import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../../config/axios_config.jsx";
import styles from "./editshortlists.module.css";

const EditShortlists = () => {
    const { selectedProject, setSelectedProject, availableProjects = [], refresh } =
        useOutletContext() || {};

    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);

    const [projectInfo, setProjectInfo] = useState(null);
    const [attorneys, setAttorneys] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());

    // --- Header edit state
    const [editHeaderTitle, setEditHeaderTitle] = useState("");
    const [editHeaderSubtitle, setEditHeaderSubtitle] = useState("");

    // --- Title rename state (with inline validation)
    const [titleDraft, setTitleDraft] = useState("");
    const [titleCheck, setTitleCheck] = useState({ state: "idle", msg: "" });
    // "idle" | "checking" | "available" | "taken" | "error"

    const idOf = (a) => String(a._id ?? "");

    // Reflect server values into local header inputs
    useEffect(() => {
        setEditHeaderTitle(projectInfo?.header_title ?? "");
        setEditHeaderSubtitle(projectInfo?.header_subtitle ?? "");
    }, [projectInfo]);

    // Keep titleDraft in sync with current selection
    useEffect(() => {
        setTitleDraft(selectedProject || "");
        setTitleCheck({ state: "idle", msg: "" });
    }, [selectedProject]);

    const isHeaderTitleDirty =
        !!projectInfo && editHeaderTitle !== (projectInfo.header_title ?? "");
    const isHeaderSubtitleDirty =
        !!projectInfo && editHeaderSubtitle !== (projectInfo.header_subtitle ?? "");
    const canSaveHeaders =
        !!selectedProject &&
        !!projectInfo &&
        (isHeaderTitleDirty || isHeaderSubtitleDirty) &&
        !loading;

    // --- Loaders (local only) ---
    const loadProjectDetails = async (project) => {
        if (!project) return setProjectInfo(null);
        try {
            const { data } = await api.get("/admin/shortlist/details", {
                params: { project_title: project },
                admin: true,
            });
            setProjectInfo(data?.project || null);
        } catch (err) {
            console.error(err);
            setProjectInfo(null);
        }
    };

    const loadProjectAttorneys = async (project) => {
        if (!project) return setAttorneys([]);
        try {
            const { data } = await api.get("/admin/shortlist/attorneys", {
                params: { project_title: project },
                admin: true,
            });
            setAttorneys(Array.isArray(data?.attorneys) ? data.attorneys : []);
        } catch (err) {
            console.error(err);
            setAttorneys([]);
        }
    };

    // When project changes, load details+attorneys
    useEffect(() => {
        setStatus("");
        setSelectedIds(new Set());
        if (selectedProject) {
            loadProjectDetails(selectedProject);
            loadProjectAttorneys(selectedProject);
        } else {
            setProjectInfo(null);
            setAttorneys([]);
        }
    }, [selectedProject]);

    // --- Actions ---
    const saveHeaders = async () => {
        if (!canSaveHeaders) return;
        try {
            setLoading(true);
            setStatus("Saving headers...");

            const payload = { project_title: selectedProject };
            if (isHeaderTitleDirty) payload.header_title = editHeaderTitle;
            if (isHeaderSubtitleDirty) payload.header_subtitle = editHeaderSubtitle;

            await api.post("/admin/shortlist/edit-headers", payload, { admin: true });
            await loadProjectDetails(selectedProject);
            setStatus("Headers saved.");
        } catch (err) {
            console.error(err);
            setStatus("Failed to save headers.");
        } finally {
            setLoading(false);
        }
    };

    const resetAll = () => {
        setTitleDraft(selectedProject || "");
        setTitleCheck({ state: "idle", msg: "" });
        setEditHeaderTitle(projectInfo?.header_title ?? "");
        setEditHeaderSubtitle(projectInfo?.header_subtitle ?? "");
        setStatus("Reverted edits.");
    };

    const toggleUsesVS = async () => {
        if (!projectInfo || !selectedProject) return;
        try {
            setLoading(true);
            setStatus("Updating visibility score setting...");
            const next = !Boolean(projectInfo.uses_vs);
            await api.post(
                "/admin/shortlist/set-uses-vs",
                { project_title: selectedProject, uses_vs: String(next) },
                { admin: true }
            );
            await loadProjectDetails(selectedProject);
            setStatus("Updated visibility score setting.");
        } catch (err) {
            console.error(err);
            setStatus("Failed to update visibility score.");
        } finally {
            setLoading(false);
        }
    };

    const deleteShortlist = async () => {
        if (!selectedProject) return;
        const ok = window.confirm(
            `Delete shortlist "${selectedProject}"? This cannot be undone.`
        );
        if (!ok) return;

        try {
            setLoading(true);
            setStatus("Deleting shortlist...");
            await api.post(
                "/admin/shortlist/delete-shortlist",
                { project_title: selectedProject },
                { admin: true }
            );

            await refresh?.();

            setSelectedProject?.(null);
            setProjectInfo(null);
            setAttorneys([]);
            setSelectedIds(new Set());
            setStatus("Shortlist deleted.");
        } catch (err) {
            console.error(err);
            setStatus("Failed to delete shortlist.");
        } finally {
            setLoading(false);
        }
    };

    const removeSelectedAttorneys = async () => {
        if (!selectedProject || selectedIds.size === 0) return;
        const ids = Array.from(selectedIds).map(String);
        const ok = window.confirm(
            `Remove ${ids.length} attorney(s) from "${selectedProject}"?`
        );
        if (!ok) return;

        try {
            setLoading(true);
            setStatus("Removing selected attorneys...");
            await api.post(
                "/admin/attorney/remove-attorneys",
                { project_title: selectedProject, attorney_ids: ids },
                { admin: true }
            );

            setAttorneys((prev) => prev.filter((a) => !ids.includes(idOf(a))));
            setSelectedIds(new Set());
            setStatus("Selected attorneys removed.");
        } catch (err) {
            console.error(err);
            setStatus("Failed to remove selected attorneys.");
        } finally {
            setLoading(false);
        }
    };

    // --- Title rename (debounced check + save) ---
    useEffect(() => {
        if (!titleDraft || titleDraft === selectedProject) {
            setTitleCheck({ state: "idle", msg: "" });
            return;
        }
        const t = setTimeout(async () => {
            try {
                setTitleCheck({ state: "checking", msg: "" });
                const { data } = await api.get("/admin/shortlist/check-title", {
                    params: { project_title: titleDraft },
                    admin: true,
                });
                if (data?.exists) {
                    setTitleCheck({ state: "taken", msg: "This title is taken" });
                } else {
                    setTitleCheck({ state: "available", msg: "" });
                }
            } catch (err) {
                console.error(err);
                setTitleCheck({ state: "error", msg: "Unable to verify title" });
            }
        }, 450);
        return () => clearTimeout(t);
    }, [titleDraft, selectedProject]);

    const saveNewTitle = async () => {
        if (!selectedProject) return;
        if (!titleDraft || titleDraft === selectedProject) return;
        if (titleCheck.state !== "available") return;

        try {
            setLoading(true);
            setStatus("Renaming shortlist...");
            const { data } = await api.post(
                "/admin/shortlist/edit-shortlist-title",
                { old_title: selectedProject, new_title: titleDraft },
                { admin: true }
            );
            setSelectedProject?.(data?.project?.project_name || titleDraft);
            setStatus("Shortlist renamed.");
        } catch (err) {
            console.error(err);
            const msg =
                err?.response?.status === 409
                    ? "This title is taken"
                    : err?.response?.data || "Failed to rename shortlist.";
            setTitleCheck({ state: "taken", msg });
            setStatus("Failed to rename shortlist.");
        } finally {
            setLoading(false);
        }
    };

    // --- UI helpers ---
    const toggleChecked = (rawId) => {
        const id = String(rawId);
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const canAct = !!selectedProject;

    const titleValidityClass =
        titleCheck.state === "taken" || titleCheck.state === "error"
            ? styles.invalid
            : titleCheck.state === "available"
                ? styles.valid
                : "";

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.sectionTitle}>Edit Shortlists</div>

                <div className={styles.body}>
                    <div className={styles.controlsRow}>
                        <label className={styles.inline}>
                            Shortlist:&nbsp;
                            <select
                                value={selectedProject || ""}
                                onChange={(e) => setSelectedProject?.(e.target.value || null)}
                            >
                                <option value="">Select Project</option>
                                {availableProjects.map((p, i) => (
                                    <option key={`${p}-${i}`} value={p}>
                                        {p}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <button
                            type="button"
                            className={`${styles.btn} ${styles.btnPrimary}`}
                            onClick={toggleUsesVS}
                            disabled={!canAct || !projectInfo || loading}
                            title="Toggle visibility score on/off"
                        >
                            {projectInfo?.uses_vs ? "Disable Visibility Score" : "Enable Visibility Score"}
                        </button>

                        <button
                            type="button"
                            className={`${styles.btn} ${styles.btnDanger}`}
                            onClick={deleteShortlist}
                            disabled={!canAct || loading}
                        >
                            Delete Shortlist
                        </button>
                    </div>

                    <div className={styles.projectMeta}>
                        {projectInfo ? (
                            <>
                                <div className={styles.metaEditRowTwo}>
                                    {/* Shortlist Title */}
                                    <div className={`${styles.metaItem} ${styles.form} ${titleValidityClass}`}>
                                        <label><b>Shortlist Title:</b></label>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <input
                                                placeholder="(none)"
                                                type="text"
                                                value={titleDraft}
                                                onChange={(e) => setTitleDraft(e.target.value)}
                                                disabled={!canAct || loading}
                                            />
                                            {titleCheck.state === "checking" && (
                                                <span className={styles.helper}>Checking…</span>
                                            )}
                                            {titleCheck.state === "taken" && (
                                                <span className={`${styles.helper} ${styles.helperError}`}>
                                                    {titleCheck.msg}
                                                </span>
                                            )}
                                            {titleCheck.state === "available" && titleDraft !== selectedProject && (
                                                <span className={`${styles.helper} ${styles.helperOk}`}>Available</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Header Title */}
                                    <div
                                        className={`${styles.metaItem} ${styles.form} ${isHeaderTitleDirty ? styles.dirty : ""
                                            }`}
                                    >
                                        <label><b>Header Title:</b></label>
                                        <input
                                            type="text"
                                            value={editHeaderTitle}
                                            onChange={(e) => setEditHeaderTitle(e.target.value)}
                                            placeholder="(none)"
                                        />
                                    </div>

                                    {/* Header Subtitle */}
                                    <div
                                        className={`${styles.metaItem} ${styles.form} ${isHeaderSubtitleDirty ? styles.dirty : ""
                                            }`}
                                    >
                                        <label><b>Header Subtitle:</b></label>
                                        <input
                                            type="text"
                                            value={editHeaderSubtitle}
                                            onChange={(e) => setEditHeaderSubtitle(e.target.value)}
                                            placeholder="(none)"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <em>No project selected.</em>
                        )}
                    </div>

                    <div className={styles.actionsRow}>
                        <div className={styles.metaActions}>
                            <button
                                type="button"
                                className={`${styles.btn} ${styles.btnPrimary}`}
                                onClick={saveNewTitle}
                                title="Save new shortlist title"
                                disabled={
                                    !canAct ||
                                    loading ||
                                    !titleDraft ||
                                    titleDraft === selectedProject ||
                                    titleCheck.state !== "available"
                                }
                            >
                                Save Title
                            </button>

                            <button
                                type="button"
                                className={`${styles.btn} ${styles.btnPrimary}`}
                                onClick={saveHeaders}
                                disabled={!canSaveHeaders}
                                title="Save changed headers"
                            >
                                Save Headers
                            </button>

                            <button
                                type="button"
                                className={styles.btn}
                                onClick={resetAll}
                                disabled={!canAct || loading}
                                title="Revert title & headers to current server values"
                            >
                                Reset
                            </button>
                        </div>

                        <div className={styles.attorneyActions}>
                            <button
                                type="button"
                                className={`${styles.btn} ${styles.btnDanger}`}
                                onClick={removeSelectedAttorneys}
                                disabled={!canAct || selectedIds.size === 0 || loading}
                            >
                                Remove Selected ({selectedIds.size})
                            </button>
                            <button
                                type="button"
                                className={styles.btn}
                                onClick={() => {
                                    if (selectedProject) {
                                        loadProjectAttorneys(selectedProject);
                                        loadProjectDetails(selectedProject);
                                    }
                                }}
                                disabled={!canAct || loading}
                            >
                                Refresh
                            </button>
                        </div>
                    </div>

                    <div className={styles.attorneyList}>
                        <div className={`${styles.row} ${styles.rowHeader}`}>
                            <div className={styles.c0}>Select</div>
                            <div className={styles.c1}>ID</div>
                            <div className={styles.c2}>Name</div>
                            <div className={styles.c3}>Firm</div>
                            <div className={styles.c4}>Email</div>
                        </div>

                        {canAct && attorneys.length === 0 && (
                            <div className={styles.empty}>No attorneys in this shortlist.</div>
                        )}

                        {attorneys.map((a) => {
                            const id = idOf(a);
                            const isSelected = selectedIds.has(id);
                            return (
                                <div
                                    className={`${styles.row} ${isSelected ? styles.selected : ""}`}
                                    key={id}
                                >
                                    <div className={styles.c0}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleChecked(id)}
                                        />
                                    </div>
                                    <div className={styles.c1}>{a.attorney_id || "No ID"}</div>
                                    <div className={styles.c2}>{a.name || "-"}</div>
                                    <div className={styles.c3}>{a.current_workplace || "-"}</div>
                                    <div className={styles.c4}>{a.email || "-"}</div>
                                </div>
                            );
                        })}
                    </div>

                    <div className={styles.statusBar}>{status}</div>
                </div>
            </div>
        </div>
    );
};

export default EditShortlists;