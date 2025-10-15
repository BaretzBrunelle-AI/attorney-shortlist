import React from "react";
import styles from "./outreachnotes.module.css";

const PRIORITIES = ["High", "Standard", "Low"];

const NotesPopup = ({
    open,
    onClose,
    attorney,
    notes,
    setNotes,
    onSave,
    busy,
    fmtLocal,
    parseLocal,
}) => {
    if (!open || !attorney) return null;

    const Avatar = ({ src, meta, size = 120, className = "" }) => {
        const m = meta || { offsetX: 0, offsetY: 0, scale: 1 };
        const base = 260;
        const factor = size / base;

        const dx = (Number(m.offsetX) || 0) * factor;
        const dy = (Number(m.offsetY) || 0) * factor;
        const scale = Number(m.scale) || 1;

        return (
            <div
                className={`${styles["outreachnotes-avatar-frame"]} ${className}`}
                style={{ width: size, height: size }}
                aria-label="Attorney headshot"
            >
                {src ? (
                    <img
                        src={src}
                        alt=""
                        style={{
                            transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${scale})`,
                        }}
                    />
                ) : null}
            </div>
        );
    };

    const toggleDelete = (idx) => {
        setNotes((list) => {
            const n = [...list];
            const item = { ...n[idx] };
            if (item._state === "add") {
                // Unsaved note → remove entirely
                n.splice(idx, 1);
            } else if (item._state === "delete") {
                // Undo delete → restore previous state (or clean)
                item._state = item._prevState || "clean";
                item._prevState = undefined;
                n[idx] = item;
            } else {
                // Mark for deletion, remember previous state
                item._prevState = item._state || "clean";
                item._state = "delete";
                n[idx] = item;
            }
            return n;
        });
    };

    const setField = (idx, patch) => {
        setNotes((list) => {
            const n = [...list];
            const item = { ...n[idx], ...patch };
            if (!["add", "delete"].includes(item._state)) item._state = "edit";
            n[idx] = item;
            return n;
        });
    };

    const addNote = () => {
        setNotes((list) => [
            ...list, // append to bottom (most recent on bottom)
            {
                _tempId: crypto?.randomUUID?.() ?? `tmp-${Date.now()}`,
                _state: "add",
                date: new Date(),        // user's local (browser) time
                priority: "Standard",
                note: "",
            },
        ]);
    };

    const cls = (item) =>
        item._state === "delete"
            ? styles.noteDelete
            : item._state === "add"
                ? styles.noteAdd
                : item._state === "edit"
                    ? styles.noteEdit
                    : styles.note;

    return (
        <div className={styles["modal-layer"]}>
            <div className={styles["modal-overlay"]} onClick={onClose} />
            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles["modal-header"]}>
                    <div className={styles.person}>
                        {attorney.image ? (
                             <Avatar src={attorney.image} meta={attorney.image_meta} />
                        ) : (
                            <img
                                src=""
                                alt="No Headshot"
                                className={styles.headshot}
                            />
                        )}
                        <div className={styles.personMeta}>
                            <div className={styles.personName}>{attorney.name || "-"}</div>
                            <div className={styles.personLine}>{attorney.email || "-"}</div>
                            <div className={styles.personLine}>{attorney.phone_number || "-"}</div>
                            <div className={styles.personLine}>{attorney.current_workplace || "-"}</div>
                        </div>
                    </div>

                    <button className={`${styles.btn} ${styles.closePopup}`} onClick={onClose}>
                        Close
                    </button>
                </div>

                <div className={styles["modal-body"]}>
                    <div className={styles.notesHeader}>
                        <div className={styles.notesTitle}>Outreach Notes</div>
                        <button
                            className={`${styles.btn} ${styles["btn-primary"]}`}
                            onClick={addNote}
                        >
                            + Add Note
                        </button>
                    </div>

                    <div className={styles.notesList}>
                        {notes.length === 0 && <div className={styles.empty}>No notes yet.</div>}

                        {notes.map((n, idx) => (
                            <div key={n.note_id || n._tempId} className={cls(n)}>
                                <div className={styles.noteGrid}>
                                    {/* Priority column */}
                                    <div className={styles.fieldCol}>
                                        <label>Priority</label>
                                        <select
                                            value={n.priority || "Standard"}
                                            onChange={(e) => setField(idx, { priority: e.target.value })}
                                            disabled={n._state === "delete"}
                                        >
                                            {PRIORITIES.map((p) => (
                                                <option key={p} value={p}>
                                                    {p}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Date/Time column */}
                                    <div className={styles.fieldCol}>
                                        <label>Date/Time</label>
                                        <input
                                            type="datetime-local"
                                            value={fmtLocal(n.date)}
                                            onChange={(e) => setField(idx, { date: parseLocal(e.target.value) })}
                                            disabled={n._state === "delete"}
                                        />
                                    </div>

                                    {/* Note column */}
                                    <div className={`${styles.fieldCol} ${styles.noteCol}`}>
                                        <label>Note</label>
                                        <textarea
                                            className={styles.noteColTextarea}
                                            rows={3}
                                            value={n.note || ""}
                                            onChange={(e) => setField(idx, { note: e.target.value })}
                                            disabled={n._state === "delete"}
                                        />
                                    </div>
                                </div>

                                <button
                                    className={styles.noteDeleteBtn}
                                    title="Remove"
                                    onClick={() => toggleDelete(idx)}
                                >
                                    <span className={styles.closeSpanTop}></span>
                                    <span className={styles.closeSpanBottom}></span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles["modal-footer"]}>
                    <div className={styles.spacer} />
                    <button
                        className={`${styles.btn} ${styles["btn-primary"]}`}
                        disabled={busy}
                        onClick={onSave}
                    >
                        {busy ? "Saving…" : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotesPopup;