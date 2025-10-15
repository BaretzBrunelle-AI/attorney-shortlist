import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../../config/axios_config.jsx";
import styles from "./editattorneys.module.css";

// Extracted components
import AttorneyPopup from "./attorney_popup.jsx";
import ImageCropPopup from "./imagecrop_popup.jsx";

const DEFAULT_META = { offsetX: 0, offsetY: 0, scale: 1 };

const EditAttorneys = () => {
    const { selectedProject, setSelectedProject } = useOutletContext() || {};

    const [projects, setProjects] = useState([]);
    const [list, setList] = useState([]);

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");

    // Image file pick state
    const [newImageFile, setNewImageFile] = useState(null);
    const [newImagePreview, setNewImagePreview] = useState(null);

    // Modal state
    const [copyTarget, setCopyTarget] = useState("");
    const [open, setOpen] = useState(false);
    const [isNew, setIsNew] = useState(false);
    const [original, setOriginal] = useState(null);
    const [draft, setDraft] = useState(null);
    const [tier, setTier] = useState("");
    const [idCheck, setIdCheck] = useState({ state: "idle", msg: "" });

    // Cropper popup state
    const [cropperOpen, setCropperOpen] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0, s: 1 });

    // Sorting + search
    const [sort, setSort] = useState({ key: null, dir: "asc" });
    const [query, setQuery] = useState("");

    // ---------- helpers for "has edit" ----------
    const isEqual = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
    const changed = (key) => !!original && !isEqual(draft?.[key], original?.[key]);
    const tagChanged = (idx, which /* 'key' | 'value' */) => {
        const o = (original?.tags || [])[idx] || { key: "", value: "" };
        const d = (draft?.tags || [])[idx] || { key: "", value: "" };
        return which === "key" ? o.key !== d.key : o.value !== d.value;
    };
    const imageChanged = () => !!original && draft?.image !== (original?.image || "");
    const imageMetaChanged = () => !!original && !isEqual(draft?.image_meta, original?.image_meta);
    const tierChanged = () => (tier || "") !== (original?.tier || "");

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                guardedCloseEditor();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, draft, original, tier]);

    // ---- Load projects locally on mount
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const { data } = await api.get("/admin/shortlist/get-projects", { admin: true });

                const list = Array.isArray(data?.projects) ? data.projects : [];

                setProjects(list);
                setStatus("");
            } catch (e) {
                console.error(e);
                setProjects([]);
                setStatus("Failed to load projects");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // ---- Load attorneys when project changes
    useEffect(() => {
        setStatus("");
        if (!selectedProject) {
            setList([]);
            return;
        }
        (async () => {
            try {
                setLoading(true);
                const { data } = await api.get("/admin/attorney/list", {
                    params: { project_title: selectedProject },
                    admin: true,
                });
                setList(Array.isArray(data?.attorneys) ? data.attorneys : []);
            } catch (e) {
                console.error(e);
                setList([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [selectedProject]);

    // ---- Open modal for a single attorney (fetch fresh)
    const openEditor = async (row) => {
        try {
            setLoading(true);
            const { data } = await api.get("/admin/attorney/get", {
                params: { project_title: selectedProject, _id: row._id },
                admin: true,
            });
            const a = data?.attorney;
            if (!a?._id) {
                setStatus("Attorney not found.");
                return;
            }
            setIsNew(false);
            setOriginal(a);
            setDraft({
                _id: a._id,
                attorney_id: a.attorney_id,
                name: a.name || "",
                linkedin: a.linkedin || "",
                website: a.website || "",
                image: a.image || "",
                image_meta: a.image_meta || { ...DEFAULT_META },
                grad_year: a.grad_year || "",
                location: a.location || "",
                current_workplace: a.current_workplace || "",
                phone_number: a.phone_number || "",
                email: a.email || "",
                visibility_score: a.visibility_score || "",
                summary: a.summary || "",
                tags: (Array.isArray(a.tags) ? a.tags : []).map((t, i) => ({
                    ...t,
                    _key: crypto?.randomUUID?.() ?? `tag-${Date.now()}-${i}`,
                })),
            });
            setTier(a.tier || "");
            setCopyTarget("");
            setIdCheck({ state: "idle", msg: "" });
            setOpen(true);
        } catch (e) {
            console.error(e);
            setStatus("Failed to load attorney.");
        } finally {
            setLoading(false);
        }
    };

    // ---- Open modal to create a new attorney
    const openCreate = () => {
        if (!selectedProject) {
            setStatus("Select a project before creating an attorney.");
            return;
        }
        setIsNew(true);
        setOriginal(null);
        setDraft({
            attorney_id: "",
            name: "",
            linkedin: "",
            website: "",
            image: "",
            image_meta: { ...DEFAULT_META },
            grad_year: "",
            location: "",
            current_workplace: "",
            phone_number: "",
            email: "",
            visibility_score: "",
            summary: "",
            tags: [],
        });
        setTier("");
        setIdCheck({ state: "idle", msg: "" });
        setOpen(true);
    };

    const hasPendingChanges = () => {
        if (!draft) return false;
        if (!original) {
            // Create mode: any filled field or tier
            const anyField =
                Object.entries(draft).some(([k, v]) => {
                    if (k === "image_meta") return false;
                    if (k === "tags") return (v || []).length > 0;
                    return (typeof v === "string" ? v.trim() : v) ? true : false;
                }) || (tier || "").trim();
            return !!anyField;
        }

        // Edit mode
        const FIELDS = [
            "attorney_id",
            "name",
            "linkedin",
            "website",
            "grad_year",
            "location",
            "current_workplace",
            "phone_number",
            "email",
            "visibility_score",
            "summary",
            "image",
        ];

        if (FIELDS.some((k) => changed(k))) return true;
        if (tierChanged() || imageMetaChanged()) return true;

        const oTags = original?.tags || [];
        const dTags = draft?.tags || [];
        if (oTags.length !== dTags.length) return true;
        for (let i = 0; i < dTags.length; i++) {
            const ok = (oTags[i]?.key ?? "") === (dTags[i]?.key ?? "");
            const ov = (oTags[i]?.value ?? "") === (dTags[i]?.value ?? "");
            if (!ok || !ov) return true;
        }
        return false;
    };

    const guardedCloseEditor = () => {
        if (hasPendingChanges()) {
            const ok = window.confirm(
                "You have pending changes, are you sure you want to close without saving?"
            );
            if (!ok) return;
        }
        closeEditor();
    };

    const closeEditor = () => {
        if (newImagePreview) URL.revokeObjectURL(newImagePreview);
        setNewImageFile(null);
        setNewImagePreview(null);
        setOpen(false);
        setIsNew(false);
        setOriginal(null);
        setDraft(null);
        setTier("");
        setCopyTarget("");
        setIdCheck({ state: "idle", msg: "" });
    };

    // ---- Debounce attorney_id uniqueness check (works for both edit + create)
    useEffect(() => {
        if (!open || !draft) return;
        if (!draft.attorney_id) {
            setIdCheck({ state: "idle", msg: "" });
            return;
        }
        const sameAsOriginal = !!original && draft.attorney_id === original.attorney_id;
        if (sameAsOriginal) {
            setIdCheck({ state: "idle", msg: "" });
            return;
        }

        const t = setTimeout(async () => {
            try {
                setIdCheck({ state: "checking", msg: "" });
                const { data } = await api.get("/admin/attorney/check-attorney-id", {
                    params: {
                        attorney_id: draft.attorney_id,
                        current_id: original?._id,
                    },
                    admin: true,
                });
                setIdCheck(
                    data?.exists ? { state: "taken", msg: "ID already in use" } : { state: "ok", msg: "" }
                );
            } catch {
                setIdCheck({ state: "error", msg: "Unable to verify" });
            }
        }, 400);
        return () => clearTimeout(t);
    }, [draft?.attorney_id, open, original]);

    // ---- Tag helpers
    const removeTag = (idx) =>
        setDraft((d) => ({ ...d, tags: d.tags.filter((_, i) => i !== idx) }));
    const addTag = () =>
        setDraft((d) => ({
            ...d,
            tags: [
                ...(d.tags || []),
                { key: "", value: "", _key: crypto?.randomUUID?.() ?? `tag-${Date.now()}` },
            ],
        }));
    const setTag = (idx, key, value) =>
        setDraft((d) => {
            const next = [...(d.tags || [])];
            next[idx] = { ...next[idx], key, value };
            return { ...d, tags: next };
        });

    // Avatar (renders with image_meta) — file picker
    const onPickImageFile = (file) => {
        if (!file) return;
        const url = URL.createObjectURL(file);
        setNewImageFile(file);
        setNewImagePreview((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
        });
        setDraft((d) => ({ ...d, image: url, image_meta: { offsetX: 0, offsetY: 0, scale: 1 } }));
    };

    const clearPickedImageFile = () => {
        setNewImageFile(null);
        if (newImagePreview) URL.revokeObjectURL(newImagePreview);
        setNewImagePreview(null);
    };

    // Cropper open/save
    const handleOpenCropper = () => {
        const m = draft?.image_meta || { ...DEFAULT_META };
        setCrop({ x: m.offsetX || 0, y: m.offsetY || 0, s: m.scale || 1 });
        setCropperOpen(true);
    };
    const handleSaveCrop = (meta) => {
        setDraft((d) => ({ ...d, image_meta: meta }));
        setCropperOpen(false);
    };

    // ---- Create (new) ----
    const saveNew = async () => {
        if (!draft) return;
        if (idCheck.state === "taken" || idCheck.state === "checking") return;

        try {
            setLoading(true);
            setStatus("Creating…");

            // Minimal validations
            if (!draft.attorney_id?.trim() || !draft.name?.trim()) {
                setStatus("Attorney ID and Name are required.");
                setLoading(false);
                return;
            }
            if (!selectedProject) {
                setStatus("Select a project first.");
                setLoading(false);
                return;
            }

            // 1) Create attorney (no file yet)
            const createBody = {
                project_title: selectedProject,
                tier: (tier || "").trim() || null,
                attorney_id: draft.attorney_id?.trim(),
                name: draft.name?.trim(),
                image: "",
                image_meta: draft.image_meta || { ...DEFAULT_META },
                linkedin: draft.linkedin || "",
                website: draft.website || "",
                grad_year: draft.grad_year || "",
                location: draft.location || "",
                current_workplace: draft.current_workplace || "",
                phone_number: draft.phone_number || "",
                email: draft.email || "",
                visibility_score: draft.visibility_score || "",
                summary: draft.summary || "",
                tags: (draft.tags || []).map(({ key, value }) => ({ key, value })),
            };

            const { data: createdRes } = await api.post(
                "/admin/attorney/create-new-attorney",
                createBody,
                { admin: true }
            );
            const created = createdRes?.attorney;

            // 2) Upload image if chosen
            let uploadedImageUrl = null;
            if (newImageFile) {
                const fd = new FormData();
                fd.append("file", newImageFile);
                fd.append("attorney_id", draft.attorney_id?.trim());

                const { data: up } = await api.post(
                    "/admin/attorney/replace-image",
                    fd,
                    { headers: { "Content-Type": "multipart/form-data" }, admin: true }
                );
                uploadedImageUrl = up?.imageUrl || up?.existingImage || null;
            }

            // 3) Update UI
            setList((prev) => [
                {
                    ...(created || {}),
                    tier: (tier || "").trim() || null,
                    image: uploadedImageUrl || created?.image || "",
                },
                ...prev,
            ]);

            setStatus("Created.");
            closeEditor();
        } catch (e) {
            setStatus(e?.response?.data || "Create failed");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // ---- Edit (existing) ----
    const saveEdit = async () => {
        if (!draft) return;
        if (idCheck.state === "taken" || idCheck.state === "checking") return;

        try {
            setLoading(true);
            setStatus("Saving…");

            // 1) Upload new image first (if picked)
            let uploadedImageUrl = null;
            let nextDraft = draft;

            if (newImageFile && draft.attorney_id?.trim()) {
                const fd = new FormData();
                fd.append("file", newImageFile);
                fd.append("attorney_id", draft.attorney_id.trim());

                const { data: up } = await api.post(
                    "/admin/attorney/replace-image",
                    fd,
                    { headers: { "Content-Type": "multipart/form-data" }, admin: true }
                );
                uploadedImageUrl = up?.imageUrl || up?.existingImage || null;
                if (uploadedImageUrl) {
                    nextDraft = { ...draft, image: uploadedImageUrl };
                }
            }

            // 2) Patch only changed fields
            const changes = {};
            for (const k of Object.keys(nextDraft)) {
                if (k === "_id") continue;
                let before = original?.[k] ?? null;
                let after = nextDraft[k] ?? null;
                if (k === "tags") {
                    const scrub = (arr) =>
                        Array.isArray(arr) ? arr.map(({ key, value }) => ({ key, value })) : [];
                    before = scrub(before);
                    after = scrub(after);
                }
                if (JSON.stringify(before) !== JSON.stringify(after)) changes[k] = after;
            }

            const tierWasChanged = tierChanged();
            const body = { _id: draft._id, changes };
            if (tierWasChanged) {
                body.project_title = selectedProject;
                body.tier = tier || null;
            }

            await api.post("/admin/attorney/update", body, { admin: true });

            // 3) Optionally copy to another project (edit-only)
            if (copyTarget && copyTarget !== selectedProject) {
                try {
                    await api.post(
                        "/admin/shortlist/add-to-shortlist",
                        {
                            project_title: copyTarget,
                            attorney_id: draft.attorney_id?.trim(),
                            _id: draft._id,
                            tier: (tier || "").trim() || null,
                        },
                        { admin: true }
                    );
                } catch (err) {
                    console.error("Copy failed:", err);
                    setStatus("Saved, but copy failed.");
                }
            }

            // 4) Update local list
            setList((prev) =>
                prev.map((a) =>
                    a._id === draft._id
                        ? { ...a, ...changes, tier, image: uploadedImageUrl ?? a.image }
                        : a
                )
            );

            setStatus("Saved.");
            closeEditor();
        } catch (e) {
            setStatus(e?.response?.data || "Save failed");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        if (!original) {
            // In create mode, just clear fields
            setDraft({
                attorney_id: "",
                name: "",
                linkedin: "",
                website: "",
                image: "",
                image_meta: { ...DEFAULT_META },
                grad_year: "",
                location: "",
                current_workplace: "",
                phone_number: "",
                email: "",
                visibility_score: "",
                summary: "",
                tags: [],
            });
            setTier("");
            setIdCheck({ state: "idle", msg: "" });
            return;
        }
        setDraft({
            _id: original._id,
            attorney_id: original.attorney_id,
            name: original.name || "",
            linkedin: original.linkedin || "",
            website: original.website || "",
            image: original.image || "",
            image_meta: original.image_meta || { ...DEFAULT_META },
            grad_year: original.grad_year || "",
            location: original.location || "",
            current_workplace: original.current_workplace || "",
            phone_number: original.phone_number || "",
            email: original.email || "",
            visibility_score: original.visibility_score || "",
            summary: original.summary || "",
            tags: Array.isArray(original.tags)
                ? original.tags.map((t, i) => ({ ...t, _key: crypto?.randomUUID?.() ?? `tag-${Date.now()}-${i}` }))
                : [],
        });
        setTier(original.tier || "");
        setIdCheck({ state: "idle", msg: "" });
    };

    const removeFromThisProject = async () => {
        if (!draft) return;
        if (!window.confirm("Remove this attorney from the current project?")) return;

        try {
            setLoading(true);
            setStatus("Removing…");

            await api.post(
                "/admin/attorney/remove-attorneys",
                {
                    project_title: selectedProject,
                    attorney_ids: [String(draft._id)],
                },
                { admin: true }
            );

            setList((prev) => prev.filter((a) => a._id !== draft._id));
            setStatus("Removed from project.");
            closeEditor();
        } catch (e) {
            console.error(e);
            setStatus(e?.response?.data || "Failed to remove.");
        } finally {
            setLoading(false);
        }
    };

    const canSave = !!draft && (idCheck.state === "idle" || idCheck.state === "ok") && !loading;

    // ---------- Sorting + Search (match Outreach Notes search behavior) ----------
    const tierWeight = (t) => {
        const s = (t || "").toLowerCase();
        if (s === "marquee") return 0;
        if (s === "first class") return 1;
        if (s === "wildcard" || s === "wild card") return 2;
        return 3;
    };

    const toggleSort = (key) =>
        setSort((prev) =>
            prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
        );

    const caret = (key) => (sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : " ↕");

    // 1) Simple name-contains filter (same as Outreach Notes)
    const filtered = useMemo(() => {
        const q = (query || "").trim().toLowerCase();
        if (!q) return list;
        return list.filter((a) => (a.name || "").toLowerCase().includes(q));
    }, [list, query]);

    // 2) Apply sorting after filtering
    const displayList = useMemo(() => {
        const withIdx = filtered.map((item, i) => ({ ...item, __i: i }));
        if (sort.key) {
            const dir = sort.dir === "asc" ? 1 : -1;
            withIdx.sort((a, b) => {
                if (sort.key === "name") {
                    const r = (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
                    return r * dir || a.__i - b.__i;
                }
                if (sort.key === "email") {
                    const r = (a.email || "").localeCompare(b.email || "", undefined, { sensitivity: "base" });
                    return r * dir || a.__i - b.__i;
                }
                if (sort.key === "tier") {
                    const r = tierWeight(a.tier) - tierWeight(b.tier);
                    return r * dir || a.__i - b.__i;
                }
                return 0;
            });
        }
        return withIdx;
    }, [filtered, sort]);

    const imageEdited = imageChanged() || imageMetaChanged();

    return (
        <div className={styles["edit-attorneys-page"]}>
            <div
                className={`${styles["edit-attorneys-card"]} ${styles["admin-dashboard-content"]} ${open ? styles["has-modal"] : ""
                    }`}
            >
                <div className={styles["section-title"]}>Edit Attorneys</div>

                <div className={styles["edit-attorneys-body"]}>
                    <div className={styles["controls-row"]}>
                        <label className={styles.inline}>
                            Project:&emsp;
                            <select
                                value={selectedProject || ""}
                                onChange={(e) => setSelectedProject?.(e.target.value || null)}
                                className={styles.eaSelect}
                            >
                                <option value="">Select Project</option>
                                {projects.map((p) => (
                                    <option key={p} value={p}>
                                        {p}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {/* Search row + NEW button (matches Outreach Notes look/behavior) */}
                        <div className={styles.eaSearchRow}>
                            <input
                                type="text"
                                placeholder="Search by name…"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className={styles.eaSearchInput}
                            />
                            <button
                                className={styles.eaBtn}
                                onClick={() => setQuery("")}
                                disabled={!query}
                            >
                                Clear
                            </button>

                            <div className={styles.eaSpacer} />

                            <button
                                className={`${styles.eaBtn} ${styles.eaBtnPrimary}`}
                                onClick={openCreate}
                                disabled={!selectedProject}
                                title={
                                    selectedProject
                                        ? "Create a new attorney in this project"
                                        : "Select a project first"
                                }
                            >
                                + Add Attorney
                            </button>
                        </div>
                    </div>

                    <div className={styles["edit-att-attorneys-list"]}>
                        <div className={`${styles["edit-att-attorney-row"]} ${styles.header}`}>
                            <div className={styles["attorney-c1"]}>ID</div>
                            <div
                                className={`${styles["attorney-c2"]} ${styles.sortable}`}
                                role="button"
                                tabIndex={0}
                                onClick={() => toggleSort("name")}
                                title="Sort by name"
                            >
                                Name{caret("name")}
                            </div>
                            <div
                                className={`${styles["attorney-c3"]} ${styles.sortable}`}
                                role="button"
                                tabIndex={0}
                                onClick={() => toggleSort("email")}
                                title="Sort by email"
                            >
                                Email{caret("email")}
                            </div>
                            <div className={styles["attorney-c4"]}>Phone</div>
                            <div
                                className={`${styles["attorney-c5"]} ${styles.sortable}`}
                                role="button"
                                tabIndex={0}
                                onClick={() => toggleSort("tier")}
                                title="Sort by tier"
                            >
                                Tier{caret("tier")}
                            </div>
                        </div>

                        {!!selectedProject && displayList.length === 0 && (
                            <div className={styles.empty}>No attorneys in this shortlist.</div>
                        )}

                        {displayList.map((a) => (
                            <div
                                key={a._id}
                                className={styles["edit-att-attorney-row"]}
                                onClick={() => openEditor(a)}
                                role="button"
                            >
                                <div className={styles["attorney-c1"]}>{a.attorney_id}</div>
                                <div className={styles["attorney-c2"]}>{a.name || "-"}</div>
                                <div className={styles["attorney-c3"]}>{a.email || "-"}</div>
                                <div className={styles["attorney-c4"]}>{a.phone_number || "-"}</div>
                                <div className={styles["attorney-c5"]}>{a.tier || "-"}</div>
                            </div>
                        ))}
                    </div>

                    <div className={styles["status-bar"]}>{status}</div>
                </div>

                {open && draft && (
                    <AttorneyPopup
                        isNew={isNew}
                        selectedProject={selectedProject}
                        tier={tier}
                        onTierChange={setTier}
                        tierChanged={tierChanged()}
                        projects={projects.filter((p) => p !== selectedProject)}
                        copyTarget={copyTarget}
                        onCopyTargetChange={setCopyTarget}
                        draft={draft}
                        setDraft={setDraft}
                        idCheck={idCheck}
                        changed={changed}
                        tagChanged={tagChanged}
                        imageEdited={imageEdited}
                        onClose={guardedCloseEditor}
                        onReset={reset}
                        onSave={isNew ? saveNew : saveEdit}
                        onRemoveFromProject={removeFromThisProject}
                        onPickImageFile={onPickImageFile}
                        clearPickedImageFile={clearPickedImageFile}
                        newImageFile={newImageFile}
                        onOpenCropper={handleOpenCropper}
                    />
                )}

                <ImageCropPopup
                    open={cropperOpen}
                    src={draft?.image}
                    initialCrop={crop}
                    onSave={handleSaveCrop}
                    onClose={() => setCropperOpen(false)}
                />
            </div>
        </div>
    );
};

export default EditAttorneys;