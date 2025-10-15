import React from "react";
import styles from "./editattorneys.module.css";

const Avatar = ({ src, meta, size = 100, className }) => {
    const m = meta || { offsetX: 0, offsetY: 0, scale: 1 };
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

const AttorneyPopup = ({
    // mode + context
    isNew,
    selectedProject,

    // tier + optional copy
    tier,
    onTierChange,
    tierChanged,
    projects = [],
    copyTarget,
    onCopyTargetChange,

    // data
    draft,
    setDraft,
    idCheck,

    // helpers
    changed,
    tagChanged,
    imageEdited,

    // actions
    onClose,
    onReset,
    onSave,
    onRemoveFromProject,
    onPickImageFile,
    clearPickedImageFile,
    newImageFile,
    onOpenCropper,
}) => {
    return (
        <div className={styles["modal-layer"]}>
            <div className={styles["modal-overlay"]} onClick={onClose} />
            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-label={isNew ? "Create attorney" : "Edit attorney"}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles["modal-header"]}>
                    <div className={styles["modal-title"]}>
                        <div className={styles["modal-title-sub-container"]}>
                            {isNew ? `Select New Attorney Tier for "${selectedProject}"` : `Tier for "${selectedProject}":`}
                            <select
                                value={tier}
                                onChange={(e) => onTierChange(e.target.value)}
                                className={!isNew && tierChanged ? styles.hasEdit : undefined}
                                id={styles["modal-title-select"]}
                            >
                                {["Marquee", "First Class", "Wildcard", ""].map((t) => (
                                    <option key={t || "none"} value={t}>
                                        {t || "(none)"}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles["modal-title-sub-container"]}>
                            {!isNew && (
                                <>
                                    Copy to project:
                                    <select
                                        value={copyTarget}
                                        onChange={(e) => onCopyTargetChange(e.target.value)}
                                        title="Optionally copy this attorney into another project when saving"
                                        id={styles["modal-title-select"]}
                                    >
                                        <option value="">(none)</option>
                                        {projects.map((p) => (
                                            <option key={p} value={p}>
                                                {p}
                                            </option>
                                        ))}
                                    </select>
                                </>
                            )}
                        </div>
                    </div>
                    <button className={styles.btn} onClick={onClose}>
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
                                className={!isNew && imageEdited ? styles.hasEdit : undefined}
                            />
                        </div>
                    )}

                    <div className={styles["image-controls"]}>
                        <button
                            className={styles.btn}
                            type="button"
                            onClick={() => {
                                clearPickedImageFile?.();
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
                            onChange={(e) => onPickImageFile?.(e.target.files?.[0])}
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
                                if (newImageFile) clearPickedImageFile?.();
                                setDraft((d) => ({ ...d, image: e.target.value }));
                            }}
                            className={imageEdited ? styles.hasEdit : undefined}
                        />

                        <button
                            className={styles.btn}
                            type="button"
                            disabled={!draft?.image}
                            onClick={onOpenCropper}
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
                            className={!isNew && changed?.("attorney_id") ? styles.hasEdit : undefined}
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
                            className={!isNew && changed?.("name") ? styles.hasEdit : undefined}
                        />
                    </div>

                    <div className={styles.field}>
                        <label>LinkedIn</label>
                        <input
                            value={draft?.linkedin || ""}
                            onChange={(e) => setDraft((d) => ({ ...d, linkedin: e.target.value }))}
                            className={!isNew && changed?.("linkedin") ? styles.hasEdit : undefined}
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Website</label>
                        <input
                            value={draft?.website || ""}
                            onChange={(e) => setDraft((d) => ({ ...d, website: e.target.value }))}
                            className={!isNew && changed?.("website") ? styles.hasEdit : undefined}
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Grad Year</label>
                        <input
                            value={draft?.grad_year || ""}
                            onChange={(e) => setDraft((d) => ({ ...d, grad_year: e.target.value }))}
                            className={!isNew && changed?.("grad_year") ? styles.hasEdit : undefined}
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Location</label>
                        <input
                            value={draft?.location || ""}
                            onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                            className={!isNew && changed?.("location") ? styles.hasEdit : undefined}
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Current Workplace</label>
                        <input
                            value={draft?.current_workplace || ""}
                            onChange={(e) => setDraft((d) => ({ ...d, current_workplace: e.target.value }))}
                            className={!isNew && changed?.("current_workplace") ? styles.hasEdit : undefined}
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Phone</label>
                        <input
                            value={draft?.phone_number || ""}
                            onChange={(e) => setDraft((d) => ({ ...d, phone_number: e.target.value }))}
                            className={!isNew && changed?.("phone_number") ? styles.hasEdit : undefined}
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Email</label>
                        <input
                            value={draft?.email || ""}
                            onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                            className={!isNew && changed?.("email") ? styles.hasEdit : undefined}
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Visibility Score</label>
                        <input
                            value={draft?.visibility_score || ""}
                            onChange={(e) => setDraft((d) => ({ ...d, visibility_score: e.target.value }))}
                            className={!isNew && changed?.("visibility_score") ? styles.hasEdit : undefined}
                        />
                    </div>

                    <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
                        <label>Summary</label>
                        <textarea
                            rows={4}
                            value={draft?.summary || ""}
                            onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))}
                            className={!isNew && changed?.("summary") ? styles.hasEdit : undefined}
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
                                            onChange={(e) =>
                                                setDraft((d) => {
                                                    const next = [...(d.tags || [])];
                                                    next[idx] = { ...next[idx], key: e.target.value };
                                                    return { ...d, tags: next };
                                                })
                                            }
                                            className={!isNew && tagChanged?.(idx, "key") ? styles.hasEdit : undefined}
                                        />
                                        <input
                                            placeholder="value"
                                            value={t.value}
                                            onChange={(e) =>
                                                setDraft((d) => {
                                                    const next = [...(d.tags || [])];
                                                    next[idx] = { ...next[idx], value: e.target.value };
                                                    return { ...d, tags: next };
                                                })
                                            }
                                            className={!isNew && tagChanged?.(idx, "value") ? styles.hasEdit : undefined}
                                        />
                                        <button
                                            type="button"
                                            className={styles.removeTagIcon}
                                            title="Remove"
                                            onClick={() =>
                                                setDraft((d) => ({ ...d, tags: (d.tags || []).filter((_, i) => i !== idx) }))
                                            }
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className={`${styles.addTagIcon} ${styles.add}`}
                                    onClick={() =>
                                        setDraft((d) => ({
                                            ...d,
                                            tags: [
                                                ...(d.tags || []),
                                                { key: "", value: "", _key: crypto?.randomUUID?.() ?? `tag-${Date.now()}` },
                                            ],
                                        }))
                                    }
                                >
                                    ＋
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles["modal-footer"]}>
                    {!isNew && (
                        <button className={`${styles.btn} ${styles.danger}`} type="button" onClick={onRemoveFromProject}>
                            Remove From Project
                        </button>
                    )}
                    <div className={styles.spacer} />
                    <button className={styles.btn} type="button" onClick={onReset}>
                        Reset
                    </button>
                    <button className={`${styles.btn} ${styles["btn-primary"]}`} type="button" onClick={onSave}>
                        {isNew ? "Create" : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AttorneyPopup;