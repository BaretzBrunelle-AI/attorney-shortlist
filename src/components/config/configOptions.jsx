import React, { useEffect, useMemo, useRef, useState } from "react";
import "./configOptions.css";

import SenderConfigTab from "./tabs/senders.jsx";

export default function ConfigOptions({
    loc,        // "create-forms" | "send-links" | other tab ids
    open,       // boolean: whether modal is visible
    onClose,    // function: called when closing
    title = "config options",
}) {
    if (!open) return null;

    // resolve initial active tab from loc, default to "send-links"
    const initialTabId = loc || "send-links";
    const [activeTab, setActiveTab] = useState(initialTabId);

    useEffect(() => {
        setActiveTab(loc || "send-links");
    }, [loc]);

    // refs for child-provided handlers/state
    const saveRef = useRef(null);
    const [isDirty, setIsDirty] = useState(false);
    const [isBusy, setIsBusy] = useState(false);

    // single controls object passed into whichever tab is active
    const controls = useMemo(
        () => ({
            // child calls this once to register its save handler
            setSaveHandler(fn) {
                saveRef.current = typeof fn === "function" ? fn : null;
            },
            // child calls when its data becomes dirty/clean
            setDirty(flag) {
                setIsDirty(!!flag);
            },
            // child calls when it is performing async work
            setBusy(flag) {
                setIsBusy(!!flag);
            },
        }),
        []
    );

    // when tab changes, clear dirty state + save handler
    useEffect(() => {
        setIsDirty(false);
        saveRef.current = null;
    }, [activeTab]);

    const handleSaveAndClose = async () => {
        const fn = saveRef.current;
        if (!fn) {
            onClose?.();
            return;
        }

        try {
            setIsBusy(true);
            await fn();
            setIsDirty(false);
            onClose?.();
        } catch (err) {
            console.error("[ConfigOptions] save failed", err);
        } finally {
            setIsBusy(false);
        }
    };

    const tabs = [
        { id: "send-links", label: "Send Links" },
        // if you add more later, just push here:
        // { id: "something-else", label: "Something Else" },
    ];

    return (
        <div className="configs-backdrop">
            <div className="configs-modal">
                <div className="configs-header">
                    <div className="configs-title-group">
                        <h2 className="configs-title">{title}</h2>
                        {isDirty && (
                            <span className="configs-dirty-indicator">
                                unsaved changes
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        className="configs-close"
                        onClick={onClose}
                        disabled={isBusy}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="configs-tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            className={
                                "configs-tab-btn" +
                                (activeTab === tab.id ? " active" : "")
                            }
                            onClick={() => setActiveTab(tab.id)}
                            disabled={isBusy}
                        >
                            <span>{tab.label}</span>
                            {activeTab === tab.id && isDirty && (
                                <span className="configs-tab-dot" aria-hidden="true" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="configs-body">
                    {activeTab === "send-links" && (
                        <SenderConfigTab controls={controls} />
                    )}
                </div>

                <div className="configs-footer">
                    <div className="configs-footer-main">
                        <button
                            type="button"
                            className="configs-save-btn"
                            onClick={handleSaveAndClose}
                            disabled={isBusy || !isDirty}
                        >
                            {isBusy ? "Saving…" : "Save and Close"}
                        </button>
                        <button
                            type="button"
                            className="configs-cancel-btn"
                            onClick={onClose}
                            disabled={isBusy}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}