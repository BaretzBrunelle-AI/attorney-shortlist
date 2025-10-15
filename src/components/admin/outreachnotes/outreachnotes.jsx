import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../../config/axios_config.jsx";
import styles from "./outreachnotes.module.css";

import NotesPopup from "./notes_popup.jsx";

const fmtLocal = (d) => {
    try {
        const dt = new Date(d);
        const iso = dt.toISOString();
        return iso.slice(0, 16); // yyyy-mm-ddThh:mm for datetime-local
    } catch {
        return "";
    }
};

const parseLocal = (s) => (s ? new Date(s) : new Date());

const OutreachNotes = () => {
    const {
        selectedProject,
        setSelectedProject,
        availableProjects,
        refresh
    } = useOutletContext() || {};

    const [projects, setProjects] = useState([]);
    const [attorneys, setAttorneys] = useState([]);
    const [query, setQuery] = useState("");

    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(null);
    const [notes, setNotes] = useState([]);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState("");

    // Load projects from context
    useEffect(() => {
        setProjects(availableProjects);
    }, [availableProjects]);

    // Load attorneys when project changes
    useEffect(() => {
        (async () => {
            setStatus("");
            setAttorneys([]);
            if (!selectedProject) return;
            try {
                const list = await api.get("/admin/attorney/list", {
                    params: { project_title: selectedProject },
                    admin: true,
                });
                setAttorneys(Array.isArray(list.data.attorneys) ? list.data.attorneys : []);
            } catch (e) {
                console.error(e);
                setAttorneys([]);
            }
        })();
    }, [selectedProject]);

    const filtered = useMemo(() => {
        const q = (query || "").trim().toLowerCase();
        if (!q) return attorneys;
        return attorneys.filter((a) => (a.name || "").toLowerCase().includes(q));
    }, [attorneys, query]);

    const openFor = async (att) => {
        try {
            setBusy(true);
            setStatus("Loading notes…");
            const { data } = await api.post(
                "/admin/notes/get-outreach-notes",
                {
                    project_name: selectedProject,
                    attorney_ids: [att.attorney_id],
                },
                { admin: true }
            );

            const arr = data?.notes_by_attorney?.[att.attorney_id] || [];
            const withState = arr.map((n) => ({ ...n, _state: "clean" }));
            setActive(att);
            setNotes(withState);
            setOpen(true);
            setStatus("");
        } catch (e) {
            console.error(e);
            setStatus("Failed to load notes.");
        } finally {
            setBusy(false);
        }
    };

    const save = async () => {
        if (!active) return;
        const adds = notes.filter((n) => n._state === "add");
        const edits = notes
            .filter((n) => n._state === "edit" && n.note_id)
            .map((n) => ({
                note_id: n.note_id,
                date: n.date,
                priority: n.priority,
                note: n.note,
            }));
        const dels = notes.filter((n) => n._state === "delete" && n.note_id);

        try {
            setBusy(true);
            setStatus("Saving…");

            // 1) add in one call
            if (adds.length) {
                await api.post(
                    "/admin/notes/add-notes",
                    {
                        project_name: selectedProject,
                        attorney_id: active.attorney_id,
                        notes: adds.map((n) => ({
                            date: n.date,
                            priority: n.priority,
                            note: n.note,
                        })),
                    },
                    { admin: true }
                );
            }

            // 2) edit IN ONE BULK CALL (new backend bulk endpoint)
            if (edits.length) {
                await api.post(
                    "/admin/notes/edit-notes",
                    { edits },
                    { admin: true }
                );
            }

            // 3) delete in one call
            if (dels.length) {
                await api.post(
                    "/admin/notes/delete-notes",
                    {
                        project_name: selectedProject,
                        attorney_id: active.attorney_id,
                        note_ids: dels.map((n) => n.note_id),
                    },
                    { admin: true }
                );
            }

            // refresh view
            const { data } = await api.post(
                "/admin/notes/get-outreach-notes",
                {
                    project_name: selectedProject,
                    attorney_ids: [active.attorney_id],
                },
                { admin: true }
            );

            await refresh?.();

            const arr = data?.notes_by_attorney?.[active.attorney_id] || [];
            setNotes(arr.map((n) => ({ ...n, _state: "clean" })));
            setStatus("Saved.");
            setOpen(false);
        } catch (e) {
            console.error(e);
            setStatus("Save failed.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={styles["outreachnotes-page"]}>
            <div
                className={`${styles["outreachnotes-card"]} ${styles["admin-dashboard-content"]} ${open ? styles["has-modal"] : ""
                    }`}
            >
                <div className={styles["section-title"]}>Outreach Notes</div>

                <div className={styles["outreachnotes-body"]}>
                    <div className={styles["controls-row"]}>
                        <label className={styles.inline}>
                            Project:&nbsp;
                            <select
                                value={selectedProject || ""}
                                onChange={(e) => setSelectedProject?.(e.target.value || null)}
                            >
                                <option value="">Select Project</option>
                                {projects.map((p) => (
                                    <option key={p} value={p}>
                                        {p}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <div className={styles.spacer} />

                        <input
                            className={styles.searchInput}
                            placeholder="Search by name…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <button className={styles.btn} onClick={() => setQuery("")} disabled={!query}>
                            Clear
                        </button>
                    </div>

                    <div className={styles["outreachnotess-list"]}>
                        <div className={`${styles["outreachnotes-row"]} ${styles.header}`}>
                            <div className={styles["attorney-c1"]}>ID</div>
                            <div className={styles["attorney-c2"]}>Name</div>
                            <div className={styles["attorney-c3"]}>Email</div>
                            <div className={styles["attorney-c4"]}>Phone</div>
                            <div className={styles["attorney-c5"]}></div>
                        </div>

                        {!!selectedProject && filtered.length === 0 && (
                            <div className={styles.empty}>No attorneys for this project.</div>
                        )}

                        {filtered.map((a) => (
                            <div
                                key={a._id}
                                className={styles["outreachnotes-row"]}
                                onClick={() => openFor(a)}
                                role="button"
                            >
                                <div className={styles["attorney-c1"]}>{a.attorney_id}</div>
                                <div className={styles["attorney-c2"]}>{a.name || "-"}</div>
                                <div className={styles["attorney-c3"]}>{a.email || "-"}</div>
                                <div className={styles["attorney-c4"]}>{a.phone_number || "-"}</div>
                                <div className={styles["attorney-c5"]}>
                                    <button className={styles.btn}>Open</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles["status-bar"]}>{status}</div>
                </div>

                <NotesPopup
                    open={open}
                    onClose={() => setOpen(false)}
                    attorney={active}
                    notes={notes}
                    setNotes={setNotes}
                    onSave={save}
                    busy={busy}
                    fmtLocal={fmtLocal}
                    parseLocal={parseLocal}
                />
            </div>
        </div>
    );
};

export default OutreachNotes;