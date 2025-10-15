import React, { useEffect, useRef, useState } from "react";
import styles from "./editattorneys.module.css";

const ImageCropPopup = ({ open, src, initialCrop = { x: 0, y: 0, s: 1 }, onSave, onClose }) => {
    const [crop, setCrop] = useState(initialCrop);
    const frameRef = useRef(null);
    const draggingRef = useRef(false);
    const lastRef = useRef({ x: 0, y: 0 });

    // Reset crop when opened or initial changes
    useEffect(() => {
        if (!open) return;
        setCrop(initialCrop);
    }, [open, initialCrop]);

    // Mouse drag handlers (global while open)
    useEffect(() => {
        if (!open) return;
        const onMove = (e) => {
            if (!draggingRef.current) return;
            const dx = e.clientX - lastRef.current.x;
            const dy = e.clientY - lastRef.current.y;
            lastRef.current = { x: e.clientX, y: e.clientY };
            setCrop((c) => ({ ...c, x: c.x + dx, y: c.y + dy }));
        };
        const onUp = () => {
            draggingRef.current = false;
            if (frameRef.current) frameRef.current.style.cursor = "grab";
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, [open]);

    // Focus the canvas so arrow keys work immediately
    useEffect(() => {
        if (open && frameRef.current) {
            // slight defer to ensure element is mounted
            setTimeout(() => frameRef.current?.focus(), 0);
        }
    }, [open]);

    if (!open) return null;

    const onDown = (e) => {
        draggingRef.current = true;
        lastRef.current = { x: e.clientX, y: e.clientY };
        if (frameRef.current) frameRef.current.style.cursor = "grabbing";
    };

    const onWheel = (e) => {
        e.preventDefault();
        const dir = e.deltaY > 0 ? -1 : 1;
        setCrop((c) => {
            const next = Math.min(3, Math.max(0.5, c.s + dir * 0.05));
            return { ...c, s: next };
        });
    };

    // Arrow-key nudging
    const onKeyDown = (e) => {
        // Only handle arrow keys here
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;

        e.preventDefault();
        // Fine step with Alt/Option, larger with Shift, default medium
        const step = e.altKey ? 1 : e.shiftKey ? 20 : 5;

        setCrop((c) => {
            let { x, y } = c;
            if (e.key === "ArrowLeft") x -= step;
            if (e.key === "ArrowRight") x += step;
            if (e.key === "ArrowUp") y -= step;
            if (e.key === "ArrowDown") y += step;
            return { ...c, x, y };
        });
    };

    const handleSave = () => {
        onSave?.({
            offsetX: Math.round(crop.x),
            offsetY: Math.round(crop.y),
            scale: +crop.s.toFixed(2),
        });
    };

    const resetCrop = () => setCrop({ x: 0, y: 0, s: 1 });

    return (
        <div className={styles["cropper-layer"]}>
            <div className={styles["cropper-overlay"]} onClick={onClose} />
            <div
                className={styles["cropper-modal"]}
                role="dialog"
                aria-modal="true"
                aria-label="Adjust image crop"
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles["cropper-header"]}>
                    <strong>Adjust Image Crop</strong>
                    <button className={styles.btn} onClick={onClose}>
                        Close
                    </button>
                </div>

                <div className={styles["cropper-body"]}>
                    <div
                        ref={frameRef}
                        className={styles["avatar-editor-canvas"]}
                        onMouseDown={onDown}
                        onWheel={onWheel}
                        onKeyDown={onKeyDown}
                        title="Drag to pan • Scroll to zoom • Arrow keys to nudge (Shift=fast, Alt=fine)"
                        style={{ cursor: "grab" }}
                        tabIndex={0}                 // <-- focusable for keyboard input
                        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"
                    >
                        {src && (
                            <img
                                src={src}
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
                            <button className={`${styles.btn} ${styles["btn-primary"]}`} onClick={handleSave}>
                                Save
                            </button>
                        </div>

                        <div className={styles.helper} style={{ marginTop: 8 }}>
                            Tip: Use arrow keys to nudge. Hold <kbd>Shift</kbd> for faster movement, <kbd>Alt</kbd> for fine.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageCropPopup;