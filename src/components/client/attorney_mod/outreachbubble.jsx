import React, { useEffect, useRef, useState } from "react";
import postit from "../../../assets/icons/post-it.png";

const OutreachNotesBubble = ({ notes = [] }) => {
    const [open, setOpen] = useState(false);
    const [side, setSide] = useState("right"); // "right" | "left"
    const wrapRef = useRef(null);
    const btnRef = useRef(null);
    const bubbleRef = useRef(null);

    const fmtTime = (d) => {
        const dt = new Date(d);
        return isNaN(+dt)
            ? ""
            : dt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    };

    // Close on outside click / ESC
    useEffect(() => {
        if (!open) return;
        const onClick = (e) => {
            if (!wrapRef.current?.contains(e.target)) setOpen(false);
        };
        const onKey = (e) => {
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("mousedown", onClick);
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("mousedown", onClick);
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    // Decide which side to render the bubble when opened, and on resize/scroll
    useEffect(() => {
        if (!open) return;

        const computeSide = () => {
            const trigger = btnRef.current;
            const bubble = bubbleRef.current;
            if (!trigger) return;

            const rect = trigger.getBoundingClientRect();
            const vw = window.innerWidth || document.documentElement.clientWidth;
            const margin = 12; // gap between icon and bubble
            const bubbleWidth = bubble?.offsetWidth || 280; // default width fallback

            const spaceRight = vw - rect.right;
            const spaceLeft = rect.left;

            // Prefer right if it fits; otherwise left; otherwise whichever has more room
            if (spaceRight >= bubbleWidth + margin) setSide("right");
            else if (spaceLeft >= bubbleWidth + margin) setSide("left");
            else setSide(spaceRight >= spaceLeft ? "right" : "left");
        };

        // Compute now (after bubble paints)
        const t = requestAnimationFrame(computeSide);

        // Recompute on resize/scroll
        window.addEventListener("resize", computeSide);
        window.addEventListener("scroll", computeSide, true); // true = capture scrolling ancestors too

        return () => {
            cancelAnimationFrame(t);
            window.removeEventListener("resize", computeSide);
            window.removeEventListener("scroll", computeSide, true);
        };
    }, [open]);

    return (
        <div className="attorney-outreach-notes-main-container" ref={wrapRef}>
            <button
                ref={btnRef}
                type="button"
                className="attorney-outreach-notes-btn"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-controls="outreach-notes-bubble"
                title={open ? "Hide notes" : "Show notes"}
            >
                <img className="attorney-outreach-img-icon" src={postit} alt="Outreach Notes" />
            </button>

            {open && (
                <div
                    id="outreach-notes-bubble"
                    ref={bubbleRef}
                    className={`notes-bubble ${side === "left" ? "left" : "right"}`}
                    role="dialog"
                    aria-label="Outreach notes"
                >
                    <div className="notes-bubble-header">
                        <div><strong>Outreach Notes</strong></div>
                        <button
                            className="notes-bubble-close"
                            onClick={() => setOpen(false)}
                            aria-label="Close"
                        >
                            ×
                        </button>
                    </div>
                    <ul className="notes-bubble-list">
                        {notes.map((n, i) => (
                            <li key={n.note_id || i}>
                                <div className="note-text">{n.note || "(no text)"}</div>
                                <div className="note-time">{fmtTime(n.date)}</div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default OutreachNotesBubble;