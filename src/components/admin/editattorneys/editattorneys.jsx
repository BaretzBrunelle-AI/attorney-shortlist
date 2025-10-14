import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../../config/axios_config.jsx";
import styles from "./editattorneys.module.css";

const TIERS = ["Marquee", "First Class", "Wildcard", ""];
const DEFAULT_META = { offsetX: 0, offsetY: 0, scale: 1 };

const EditAttorneys = () => {
    const { selectedProject, setSelectedProject } = useOutletContext() || {};

    const [projects, setProjects] = useState([]);
    const [list, setList] = useState([]);

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");

    // add next to other state
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

                const names = Array.isArray(data?.projects)
                    ? data.projects.map((p) => (typeof p === "string" ? p : p?.project_name)).filter(Boolean)
                    : [];

                const uniqSorted = Array.from(new Set(names)).sort((a, b) =>
                    a.localeCompare(b, undefined, { sensitivity: "base" })
                );

                setProjects(uniqSorted);
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
                    _key: (crypto?.randomUUID?.() ?? `tag-${Date.now()}-${i}`),
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
            tags: [], // empty; new tags will get _key when added
        });
        setTier("");
        setIdCheck({ state: "idle", msg: "" });
        setOpen(true);
    };

    const hasPendingChanges = () => {
        if (!draft) return false;
        if (!original) {
            // Create mode: if any field has content, or any tag, or tier
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
        // Skip "same as original" optimization if creating
        const sameAsOriginal =
            !!original && draft.attorney_id === original.attorney_id;
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
                        current_id: original?._id, // undefined in create mode
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
                image_meta: draft.image_meta || { offsetX: 0, offsetY: 0, scale: 1 },
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
                    "/admin/attorney/update-attorney-image",
                    fd,
                    { headers: { "Content-Type": "multipart/form-data" }, admin: true }
                );
                uploadedImageUrl = up?.imageUrl || up?.existingImage || null;
            }

            // NOTE: No "copy to project" in create mode.

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

    // ---------- Sorting + Search helpers ----------
    const tierWeight = (t) => {
        const s = (t || "").toLowerCase();
        if (s === "marquee") return 0;
        if (s === "first class") return 1;
        if (s === "wildcard") return 2;
        return 3;
    };

    const toggleSort = (key) =>
        setSort((prev) =>
            prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
        );

    const caret = (key) => (sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : " ↕");

    const nameScore = (q, name) => {
        const needle = (q || "").trim().toLowerCase();
        const hay = (name || "").toLowerCase();
        if (!needle) return 0;
        if (hay === needle) return 1000;
        if (hay.startsWith(needle)) return 800;
        const idx = hay.indexOf(needle);
        if (idx !== -1) return 600 - idx;
        let overlap = 0;
        for (const ch of new Set(needle)) if (hay.includes(ch)) overlap++;
        return overlap;
    };

    const sortedList = useMemo(() => {
        const withIdx = list.map((item, i) => ({ ...item, __i: i }));

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

        const q = query.trim();
        if (q) {
            let bestIdx = -1;
            let best = -Infinity;
            for (let i = 0; i < withIdx.length; i++) {
                const s = nameScore(q, withIdx[i].name);
                if (s > best) {
                    best = s;
                    bestIdx = i;
                }
            }
            if (bestIdx > 0) {
                const [bestItem] = withIdx.splice(bestIdx, 1);
                withIdx.unshift(bestItem);
            }
        }

        return withIdx;
    }, [list, sort, query]);

    // Avatar (renders with image_meta)
    const onPickImageFile = (file) => {
        if (!file) return;
        // preview locally so user sees the chosen image before saving
        const url = URL.createObjectURL(file);
        setNewImageFile(file);
        setNewImagePreview((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
        });
        // show preview in the UI and reset crop (optional)
        setDraft((d) => ({ ...d, image: url, image_meta: { offsetX: 0, offsetY: 0, scale: 1 } }));
    };

    const clearPickedImageFile = () => {
        setNewImageFile(null);
        if (newImagePreview) URL.revokeObjectURL(newImagePreview);
        setNewImagePreview(null);
    };

    const Avatar = ({ src, meta, size = 100, className }) => {
        const m = meta || { ...DEFAULT_META };
        const offsetX = Number(m.offsetX) || 0;
        const offsetY = Number(m.offsetY) || 0;
        const scale = Number(m.scale) || 1;

        return (
            <div
                className={`${styles.avatarThumb} ${className || ""}`}
                style={{ width: size, height: size }}
                aria-label="Attorney headshot"
            >
                {src ? (
                    <img
                        src={src}
                        alt=""
                        style={{
                            transform: `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
                        }}
                    />
                ) : null}
            </div>
        );
    };

    // ---------- Cropper ----------
    const renderCropper = () => {
        let dragging = false;
        let last = { x: 0, y: 0 };
        let frameEl = null;

        const onDown = (e) => {
            dragging = true;
            last = { x: e.clientX, y: e.clientY };
            if (frameEl) frameEl.style.cursor = "grabbing";
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
        };

        const onMove = (e) => {
            if (!dragging) return;
            const dx = e.clientX - last.x;
            const dy = e.clientY - last.y;
            last = { x: e.clientX, y: e.clientY };
            setCrop((c) => ({ ...c, x: c.x + dx, y: c.y + dy }));
        };

        const onUp = () => {
            dragging = false;
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            if (frameEl) frameEl.style.cursor = "grab";
        };

        const onWheel = (e) => {
            e.preventDefault();
            const dir = e.deltaY > 0 ? -1 : 1;
            setCrop((c) => {
                const next = Math.min(3, Math.max(0.5, c.s + dir * 0.05));
                return { ...c, s: next };
            });
        };

        const saveCrop = () => {
            setDraft((d) => ({
                ...d,
                image_meta: {
                    offsetX: Math.round(crop.x),
                    offsetY: Math.round(crop.y),
                    scale: +crop.s.toFixed(2),
                },
            }));
            setCropperOpen(false);
        };

        const resetCrop = () => setCrop({ x: 0, y: 0, s: 1 });

        return (
            <div className={styles["cropper-layer"]}>
                <div className={styles["cropper-overlay"]} onClick={() => setCropperOpen(false)} />
                <div
                    className={styles["cropper-modal"]}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Adjust image crop"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={styles["cropper-header"]}>
                        <strong>Adjust Image Crop</strong>
                        <button className={styles.btn} onClick={() => setCropperOpen(false)}>
                            Close
                        </button>
                    </div>

                    <div className={styles["cropper-body"]}>
                        <div
                            className={styles["avatar-editor-canvas"]}
                            onMouseDown={onDown}
                            onWheel={onWheel}
                            title="Drag to pan • Scroll to zoom"
                            ref={(el) => (frameEl = el)}
                            style={{ cursor: "grab" }}
                        >
                            {draft?.image && (
                                <img
                                    src={draft.image}
                                    alt=""
                                    style={{
                                        transform: `translate(-50%, -50%) translate(${crop.x}px, ${crop.y}px) scale(${crop.s})`,
                                    }}
                                />
                            )}
                        </div>

                        <div className={styles["cropper-controls"]}>
                            <div className={styles["zoom-row"]}>
                                <button
                                    className={styles.btn}
                                    onClick={() => setCrop((c) => ({ ...c, s: Math.max(0.5, +(c.s - 0.05).toFixed(2)) }))}
                                >
                                    −
                                </button>
                                <div className={styles["zoom-indicator"]}>Zoom: {Math.round(crop.s * 100)}%</div>
                                <button
                                    className={styles.btn}
                                    onClick={() => setCrop((c) => ({ ...c, s: Math.min(3, +(c.s + 0.05).toFixed(2)) }))}
                                >
                                    +
                                </button>
                            </div>

                            <div className={styles["actions-row"]}>
                                <button className={styles.btn} onClick={resetCrop}>
                                    Reset
                                </button>
                                <button className={`${styles.btn} ${styles["btn-primary"]}`} onClick={saveCrop}>
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderPopup = () => {
        const imgEdited = imageChanged() || imageMetaChanged();

        return (
            <div className={styles["modal-layer"]}>
                <div className={styles["modal-overlay"]} onClick={guardedCloseEditor} />
                <div
                    className={styles.modal}
                    role="dialog"
                    aria-modal="true"
                    aria-label={isNew ? "Create attorney" : "Edit attorney"}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={styles["modal-header"]}>
                        <div className={styles["modal-title"]}>
                            {isNew ? `New Attorney for "${selectedProject}"` : `Tier for "${selectedProject}":`} &emsp;
                            <select
                                value={tier}
                                onChange={(e) => setTier(e.target.value)}
                                className={!isNew && tierChanged() ? styles.hasEdit : undefined}
                            >
                                {TIERS.map((t) => (
                                    <option key={t || "none"} value={t}>{t || "(none)"}</option>
                                ))}
                            </select>

                            {!isNew && (
                                <>
                                    <span style={{ marginLeft: 16, marginRight: 6 }}>Copy to project:</span>
                                    <select
                                        value={copyTarget}
                                        onChange={(e) => setCopyTarget(e.target.value)}
                                        title="Optionally copy this attorney into another project when saving"
                                    >
                                        <option value="">(none)</option>
                                        {projects
                                            .filter((p) => p !== selectedProject)
                                            .map((p) => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                    </select>
                                </>
                            )}
                        </div>
                        <button className={styles.btn} onClick={guardedCloseEditor}>
                            Close
                        </button>
                    </div>

                    {/* Image controls */}
                    <div className={styles["image-field"]} style={{ gridColumn: "1 / -1" }}>
                        {!!draft?.image && (
                            <div className={styles["image-thumbnail-container"]}>
                                <label>
                                    <strong>Attorney Headshot</strong>
                                </label>
                                <Avatar
                                    src={draft.image}
                                    meta={draft.image_meta}
                                    size={100}
                                    className={!isNew && imgEdited ? styles.hasEdit : undefined}
                                />
                            </div>
                        )}

                        <div className={styles["image-controls"]}>
                            <button
                                className={styles.btn}
                                type="button"
                                onClick={() => {
                                    clearPickedImageFile();
                                    setDraft((d) => ({ ...d, image: "" }));
                                }}
                            >
                                Remove
                            </button>

                            <input
                                id="file-input"
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={(e) => onPickImageFile(e.target.files?.[0])}
                            />
                            <button
                                className={styles.btn}
                                type="button"
                                onClick={() => document.getElementById("file-input")?.click()}
                            >
                                Replace Image
                            </button>
                            {newImageFile && (
                                <span className={styles.helper} style={{ marginLeft: 8 }}>
                                    Selected: {newImageFile.name}
                                </span>
                            )}

                            <input
                                type="url"
                                placeholder="Replace via URL…"
                                value={draft?.image || ""}
                                onChange={(e) => {
                                    // if user types a URL, clear the picked file so we don't upload both
                                    if (newImageFile) clearPickedImageFile();
                                    setDraft((d) => ({ ...d, image: e.target.value }));
                                }}
                                className={imgEdited ? styles.hasEdit : undefined}
                            />

                            <button
                                className={styles.btn}
                                type="button"
                                disabled={!draft?.image}
                                onClick={() => {
                                    const m = draft?.image_meta || { offsetX: 0, offsetY: 0, scale: 1 };
                                    setCrop({ x: m.offsetX || 0, y: m.offsetY || 0, s: m.scale || 1 });
                                    setCropperOpen(true);
                                }}
                                title="Adjust how the image sits in the circular frame"
                            >
                                Adjust Crop
                            </button>
                        </div>
                    </div>

                    <div className={styles["modal-body"]}>
                        <div className={`${styles.field} ${idCheck.state === "taken" ? styles.invalid : ""}`}>
                            <label>Attorney ID</label>
                            <input
                                type="text"
                                value={draft?.attorney_id || ""}
                                onChange={(e) => setDraft((d) => ({ ...d, attorney_id: e.target.value }))}
                                className={!isNew && changed("attorney_id") ? styles.hasEdit : undefined}
                            />
                            {idCheck.state === "checking" && <span className={styles.helper}>Checking…</span>}
                            {idCheck.state === "taken" && (
                                <span className={`${styles.helper} ${styles.error}`}>{idCheck.msg}</span>
                            )}
                        </div>

                        <div className={styles.field}>
                            <label>Name</label>
                            <input
                                value={draft?.name || ""}
                                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                                className={!isNew && changed("name") ? styles.hasEdit : undefined}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>LinkedIn</label>
                            <input
                                value={draft?.linkedin || ""}
                                onChange={(e) => setDraft((d) => ({ ...d, linkedin: e.target.value }))}
                                className={!isNew && changed("linkedin") ? styles.hasEdit : undefined}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>Website</label>
                            <input
                                value={draft?.website || ""}
                                onChange={(e) => setDraft((d) => ({ ...d, website: e.target.value }))}
                                className={!isNew && changed("website") ? styles.hasEdit : undefined}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>Grad Year</label>
                            <input
                                value={draft?.grad_year || ""}
                                onChange={(e) => setDraft((d) => ({ ...d, grad_year: e.target.value }))}
                                className={!isNew && changed("grad_year") ? styles.hasEdit : undefined}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>Location</label>
                            <input
                                value={draft?.location || ""}
                                onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                                className={!isNew && changed("location") ? styles.hasEdit : undefined}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>Current Workplace</label>
                            <input
                                value={draft?.current_workplace || ""}
                                onChange={(e) => setDraft((d) => ({ ...d, current_workplace: e.target.value }))}
                                className={!isNew && changed("current_workplace") ? styles.hasEdit : undefined}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>Phone</label>
                            <input
                                value={draft?.phone_number || ""}
                                onChange={(e) => setDraft((d) => ({ ...d, phone_number: e.target.value }))}
                                className={!isNew && changed("phone_number") ? styles.hasEdit : undefined}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>Email</label>
                            <input
                                value={draft?.email || ""}
                                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                                className={!isNew && changed("email") ? styles.hasEdit : undefined}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>Visibility Score</label>
                            <input
                                value={draft?.visibility_score || ""}
                                onChange={(e) => setDraft((d) => ({ ...d, visibility_score: e.target.value }))}
                                className={!isNew && changed("visibility_score") ? styles.hasEdit : undefined}
                            />
                        </div>

                        <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
                            <label>Summary</label>
                            <textarea
                                rows={4}
                                value={draft?.summary || ""}
                                onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))}
                                className={!isNew && changed("summary") ? styles.hasEdit : undefined}
                            />
                        </div>

                        {/* Tags */}
                        <div className={styles["tags-field"]} style={{ gridColumn: "1 / -1" }}>
                            <label>Tags</label>
                            <div className={styles["tags-main-container"]}>
                                <div className={styles["tags-wrap"]}>
                                    {(draft?.tags || []).map((t, idx) => (
                                        <div key={t._key || `${idx}-${t.key}-${t.value}`} className={styles["tag-chip"]}>
                                            <input
                                                placeholder="key"
                                                value={t.key}
                                                onChange={(e) => setTag(idx, e.target.value, t.value)}
                                                className={!isNew && tagChanged(idx, "key") ? styles.hasEdit : undefined}
                                            />
                                            <input
                                                placeholder="value"
                                                value={t.value}
                                                onChange={(e) => setTag(idx, t.key, e.target.value)}
                                                className={!isNew && tagChanged(idx, "value") ? styles.hasEdit : undefined}
                                            />
                                            <button
                                                type="button"
                                                className={styles.removeTagIcon}
                                                title="Remove"
                                                onClick={() => removeTag(idx)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        className={`${styles.addTagIcon} ${styles.add}`}
                                        onClick={addTag}
                                    >
                                        ＋
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles["modal-footer"]}>
                        {!isNew && (
                            <button
                                className={`${styles.btn} ${styles.danger}`}
                                type="button"
                                onClick={removeFromThisProject}
                            >
                                Remove From Project
                            </button>
                        )}
                        <div className={styles.spacer} />
                        <button className={styles.btn} type="button" onClick={reset}>
                            Reset
                        </button>
                        <button
                            className={`${styles.btn} ${styles["btn-primary"]}`}
                            type="button"
                            onClick={isNew ? saveNew : saveEdit}
                            disabled={!canSave}
                        >
                            {isNew ? "Create" : "Save"}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

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
                            >
                                <option value="">Select Project</option>
                                {projects.map((p) => (
                                    <option key={p} value={p}>
                                        {p}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    {/* Search row + NEW button */}
                    <div className={styles.searchRow}>
                        <input
                            type="text"
                            placeholder="Search by name…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                        <button className={styles.btn} onClick={() => setQuery("")} disabled={!query}>
                            Clear
                        </button>
                        <button
                            className={`${styles.btn} ${styles["btn-primary"]}`}
                            onClick={openCreate}
                            disabled={!selectedProject}
                            title={selectedProject ? "Create a new attorney in this project" : "Select a project first"}
                            style={{ marginLeft: 8 }}
                        >
                            + New Attorney
                        </button>
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

                        {!!selectedProject && sortedList.length === 0 && (
                            <div className={styles.empty}>No attorneys in this shortlist.</div>
                        )}

                        {sortedList.map((a) => (
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

                {open && draft && renderPopup()}
                {cropperOpen && renderCropper()}
            </div>
        </div>
    );
};

export default EditAttorneys;