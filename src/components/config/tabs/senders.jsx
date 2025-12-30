import { useEffect, useState } from "react";
import api from "../../../config/axios_config.jsx";
import "../configOptions.css";

const emptyForm = {
    email: "",
    name: "",
    active: true,
    default: false,
};

const SenderConfigTab = ({ isActive = true }) => {
    const [senders, setSenders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState(emptyForm);

    const isBusy = loading || saving;

    const loadSenders = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await api.get("/admin/config/email/senders", { admin: true });
            setSenders(Array.isArray(res.data?.senders) ? res.data.senders : []);
        } catch (err) {
            console.error("[SenderConfigTab] failed to load senders", err);
            setError("failed to load senders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isActive) {
            loadSenders();
        }
    }, [isActive]);

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleAddOrUpdate = async () => {
        if (!form.email.trim() || !form.name.trim()) {
            setError("Email and Name are required");
            return;
        }

        setSaving(true);
        setError("");
        try {
            const payload = {
                email: form.email.trim(),
                name: form.name.trim(),
                active: form.active,
                default: form.default,
            };
            const res = await api.post("/admin/config/email/senders", payload, { admin: true });
            const sender = res.data?.sender;
            if (sender) {
                // if we just set default true, reload to get cleared defaults
                if (payload.default) {
                    await api.patch("/admin/config/email/senders/default", { email: sender.email });
                }
                await loadSenders();
            }
            setForm(emptyForm);
        } catch (err) {
            console.error("[SenderConfigTab] failed to add/update sender", err);
            setError("failed to save sender");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (email, nextActive) => {
        setSaving(true);
        setError("");
        try {
            await api.patch(`/admin/config/email/senders/${encodeURIComponent(email)}/active`, {
                active: nextActive,
            }, { admin: true });
            setSenders((prev) =>
                prev.map((s) =>
                    s.email === email ? { ...s, active: nextActive } : s
                )
            );
        } catch (err) {
            console.error("[SenderConfigTab] failed to toggle active", err);
            setError("failed to update active flag");
        } finally {
            setSaving(false);
        }
    };

    const handleSetDefault = async (email) => {
        setSaving(true);
        setError("");
        try {
            await api.patch("/admin/config/email/senders/default", { email }, { admin: true });
            // reload so we pick up the single default
            await loadSenders();
        } catch (err) {
            console.error("[SenderConfigTab] failed to set default", err);
            setError("failed to set default sender");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (email) => {
        const ok = window.confirm(`delete sender "${email}"?`);
        if (!ok) return;

        setSaving(true);
        setError("");
        try {
            await api.delete(`/admin/config/email/senders/${encodeURIComponent(email)}`, { admin: true });
            setSenders((prev) => prev.filter((s) => s.email !== email));
        } catch (err) {
            console.error("[SenderConfigTab] failed to delete sender", err);
            setError("failed to delete sender");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className={`config-setting-row ${isBusy ? "is-loading" : ""}`}
            aria-hidden={!isActive}
            style={{ display: isActive ? "flex" : "none" }}
        >
            <div className="config-toolbar">
                <button
                    type="button"
                    className="config-add-btn"
                    onClick={loadSenders}
                    disabled={loading}
                >
                    Refresh
                </button>
            </div>

            <div className="config-list">
                {/* add / edit row */}
                <div className="config-add-row">
                    <div className="config-add-col file">
                        <label>
                            <span>Sender Email</span>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => handleChange("email", e.target.value)}
                                placeholder="sender@example.com"
                            />
                        </label>
                        <label>
                            <span>Display Name</span>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => handleChange("name", e.target.value)}
                                placeholder="Sender Display Name"
                            />
                        </label>
                    </div>

                    <div className="config-col active">
                        <div className="toggle">
                            <label className="slide-toggle">
                                <input
                                    type="checkbox"
                                    checked={form.active}
                                    onChange={(e) => handleChange("active", e.target.checked)}
                                />
                                <span className="track">
                                    <span className="thumb" />
                                </span>
                                <span>Active</span>
                            </label>

                            <label className="slide-toggle">
                                <input
                                    type="checkbox"
                                    checked={form.default}
                                    onChange={(e) => handleChange("default", e.target.checked)}
                                />
                                <span className="track">
                                    <span className="thumb" />
                                </span>
                                <span>Default</span>
                            </label>
                        </div>
                    </div>

                    <div className="config-col actions">
                        <button
                            type="button"
                            className="save-btn"
                            onClick={handleAddOrUpdate}
                            disabled={saving}
                        >
                            {saving ? "+" : "+"}
                        </button>
                    </div>
                </div>

                {/* existing senders */}
                {senders.length === 0 && (
                    <div className="config-empty">
                        No senders configured yet
                    </div>
                )}

                {senders.map((s) => (
                    <div
                        key={s.email}
                        className={`config-row ${!s.active ? "row-disabled" : ""}`}
                    >
                        <div className="config-col key">
                            <div className="cfg-key" title={s.email}>
                                {s.email}
                            </div>
                            <div className="cfg-type">
                                {s.name}
                            </div>
                            <div className="badges">
                                {s.active && (
                                    <span className="badge">
                                        active
                                    </span>
                                )}
                                {s.default && (
                                    <span className="badge">
                                        default
                                    </span>
                                )}
                                {s.mutable === false && (
                                    <span className="badge">
                                        locked
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="config-col active">
                            <div className="toggle">
                                <label className={`slide-toggle ${s.mutable === false ? "disabled" : ""}`}>
                                    <input
                                        type="checkbox"
                                        checked={!!s.active}
                                        disabled={s.mutable === false}
                                        onChange={(e) =>
                                            handleToggleActive(s.email, e.target.checked)
                                        }
                                    />
                                    <span className="track">
                                        <span className="thumb" />
                                    </span>
                                    <span>Active</span>
                                </label>

                                <label className={`slide-toggle ${s.mutable === false ? "disabled" : ""}`}>
                                    <input
                                        type="checkbox"
                                        checked={!!s.default}
                                        disabled={s.mutable === false}
                                        onChange={() => handleSetDefault(s.email)}
                                    />
                                    <span className="track">
                                        <span className="thumb" />
                                    </span>
                                    <span>Default</span>
                                </label>
                            </div>
                        </div>

                        <div className="config-col actions">
                            <button
                                type="button"
                                className="icon-btn danger"
                                onClick={() => handleDelete(s.email)}
                                disabled={s.mutable === false || saving}
                                title="delete sender"
                            >
                                <span>✕</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {error && (
                <div className="config-staged">
                    <div className="config-subtitle">
                        {error}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SenderConfigTab;