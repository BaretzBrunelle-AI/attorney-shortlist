import { useState, useRef, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../../config/axios_config.jsx";

import styles from "./inviteusers.module.css";

const DEFAULT_DAYS = 30;

const InviteUsers = () => {
    const {
        selectedProject,
        setSelectedProject,
        availableProjects = [],
    } = useOutletContext() || {};

    const [users, setUsers] = useState([]);

    const [newEmail, setNewEmail] = useState("");
    const [expiresDays, setExpiresDays] = useState(DEFAULT_DAYS);

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");

    // sender config state
    const [senders, setSenders] = useState([]);
    const [selectedSender, setSelectedSender] = useState("");

    const listRef = useRef(null);

    const clearStatus = () => {
        setMsg("");
        setErr("");
    };

    const refreshUsers = async (projectName) => {
        if (!projectName) {
            setUsers([]);
            return;
        }

        clearStatus();
        try {
            const res = await api.get("/admin/access/list", {
                params: { project_name: projectName },
                admin: true,
            });

            // backend returns: { project, allowed_users: [...] }
            setUsers(res.data?.allowed_users || []);
        } catch (e) {
            setErr("failed to load user access");
        }
    };

    const handleSelectProject = async (value) => {
        setSelectedProject?.(value || null);
        await refreshUsers(value);
    };

    // load available senders + resolve initial sender selection
    const loadSenders = async () => {
        try {
            const res = await api.get("/admin/config/email/senders", {
                admin: true,
            });
            const list = Array.isArray(res.data?.senders) ? res.data.senders : [];
            setSenders(list);

            // read locally stored preferred sender, if any
            let stored = null;
            try {
                stored = window.localStorage.getItem("preferred_sender");
            } catch {
                stored = null;
            }

            const emails = new Set(list.map((s) => s.email));
            let next = "";

            // priority 1: locally stored preferred_sender if it still exists
            if (stored && emails.has(stored)) {
                next = stored;
            } else {
                // priority 2: default sender from config
                const def = list.find((s) => s.default);
                if (def) {
                    next = def.email;
                } else if (list.length > 0) {
                    // fallback: first sender in list
                    next = list[0].email;
                }
            }

            if (next) {
                setSelectedSender(next);
                try {
                    window.localStorage.setItem("preferred_sender", next);
                } catch {
                    // ignore
                }
            } else {
                setSelectedSender("");
            }
        } catch (e) {
            console.error("[InviteUsers] failed to load senders", e);
            // keep existing error if one is already shown
            if (!err) {
                setErr("failed to load sender config");
            }
        }
    };

    // when user manually changes sender, update state + preferred_sender
    const handleSenderChange = (value) => {
        setSelectedSender(value);
        try {
            window.localStorage.setItem("preferred_sender", value);
        } catch {
            // ignore
        }
    };

    const handleAddUser = async () => {
        clearStatus();

        if (!selectedProject || !newEmail.trim()) {
            setErr("project and email are required");
            return;
        }

        const days = Number(expiresDays) || DEFAULT_DAYS;

        setLoading(true);
        try {
            await api.post(
                "/admin/access/add",
                {
                    email: newEmail.trim().toLowerCase(),
                    project_name: selectedProject,
                    expires_days: days,
                },
                { admin: true }
            );

            await refreshUsers(selectedProject);
            setNewEmail("");
            setExpiresDays(DEFAULT_DAYS);
            setMsg("access updated");
        } catch (e) {
            setErr("failed to update access");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveUser = async (email) => {
        clearStatus();
        if (!selectedProject || !email) return;

        setLoading(true);
        try {
            await api.post(
                "/admin/access/remove",
                {
                    email,
                    project_name: selectedProject,
                },
                { admin: true }
            );

            await refreshUsers(selectedProject);
            setMsg("access removed");
        } catch (e) {
            setErr("failed to remove access");
        } finally {
            setLoading(false);
        }
    };

    const handleSendInvite = async (email) => {
        clearStatus();
        if (!selectedProject || !email) {
            setErr("select a project first");
            return;
        }

        setLoading(true);
        try {
            await api.post(
                "/admin/email/invite",
                {
                    project_name: selectedProject,
                    senderEmail: selectedSender || undefined,
                    invites: [
                        {
                            email,
                        },
                    ],
                },
                { admin: true }
            );
            setMsg(`invite sent to ${email}`);
            await refreshUsers(selectedProject);
        } catch (e) {
            setErr("failed to send invite");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDownAdd = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            void handleAddUser();
        }
    };

    const canAct = !!selectedProject;

    // load senders once on mount
    useEffect(() => {
        loadSenders();
    }, []);

    // always keep the add row visible at the bottom
    useEffect(() => {
        if (!listRef.current) return;
        listRef.current.scrollTop = listRef.current.scrollHeight;
    }, [users.length, selectedProject]);

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.sectionTitle}>Invite Users</div>

                <div className={styles.body}>
                    <div className={styles.controlsRow}>
                        <label className={styles.inline}>
                            Project:&nbsp;
                            <select
                                value={selectedProject || ""}
                                onChange={(e) =>
                                    handleSelectProject(e.target.value)
                                }
                            >
                                <option value="">Select Project</option>
                                {availableProjects.map((p, i) => (
                                    <option key={`${p}-${i}`} value={p}>
                                        {p}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className={styles.inline}>
                            Sender:&nbsp;
                            <select
                                value={selectedSender}
                                onChange={(e) =>
                                    handleSenderChange(e.target.value)
                                }
                                className={styles.sender}
                            >
                                {senders.length === 0 && (
                                    <option value="">
                                        No senders configured
                                    </option>
                                )}
                                {senders.length > 0 &&
                                    senders.map((s) => (
                                        <option key={s.email} value={s.email}>
                                            {s.name
                                                ? `${s.name} <${s.email}>`
                                                : s.email}
                                        </option>
                                    ))}
                            </select>
                        </label>
                    </div>

                    <div className={styles.userList} ref={listRef}>
                        <div className={`${styles.row} ${styles.rowHeader}`}>
                            <div className={styles.cEmail}>User Email</div>
                            <div className={styles.cEmail}>Email Sent</div>
                            <div className={styles.cEmail}>Viewed Shortlist</div>
                            <div className={styles.cDays}>Days Remaining</div>
                            <div className={styles.cActions}>Actions</div>
                        </div>

                        {!canAct && (
                            <div className={styles.empty}>
                                Select a shortlist to manage access
                            </div>
                        )}

                        {canAct && users.length === 0 && (
                            <div className={styles.empty}>
                                No users yet for this shortlist
                            </div>
                        )}

                        {users.map((u) => {
                            const emailSent = u.email_sent === true;
                            const viewedShortlist =
                                u.viewed_shortlist === true;

                            return (
                                <div key={u.email} className={styles.row}>
                                    <div className={styles.cEmail}>
                                        {u.email}
                                    </div>
                                    <div className={styles.cEmailStatus}>
                                        {String(emailSent)}
                                    </div>
                                    <div className={styles.cView}>
                                        {String(viewedShortlist)}
                                    </div>
                                    <div className={styles.cDays}>
                                        {!emailSent
                                            ? "Send Invite"
                                            : typeof u.days_remaining ===
                                              "number"
                                            ? u.days_remaining
                                            : "n/a"}
                                    </div>
                                    <div className={styles.cActions}>
                                        <button
                                            type="button"
                                            className={styles.btn}
                                            onClick={() =>
                                                handleSendInvite(u.email)
                                            }
                                            disabled={loading}
                                        >
                                            Send invite
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.btn} ${styles.btnDanger}`}
                                            onClick={() =>
                                                handleRemoveUser(u.email)
                                            }
                                            disabled={loading}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {canAct && (
                            <div className={`${styles.row} ${styles.addRow}`}>
                                <div className={styles.cEmail}>
                                    <input
                                        type="email"
                                        placeholder="User Email"
                                        value={newEmail}
                                        onChange={(e) =>
                                            setNewEmail(e.target.value)
                                        }
                                        onKeyDown={handleKeyDownAdd}
                                    />
                                </div>
                                {/* empty cells to align with the email_sent / viewed columns */}
                                <div className={styles.cEmail} />
                                <div className={styles.cEmail} />
                                <div className={styles.cDays}>
                                    <div className={styles.daysInline}>
                                        <input
                                            type="number"
                                            min={1}
                                            value={expiresDays}
                                            onChange={(e) =>
                                                setExpiresDays(
                                                    e.target.value
                                                )
                                            }
                                            onKeyDown={handleKeyDownAdd}
                                        />
                                        <span>Days</span>
                                    </div>
                                </div>
                                <div className={styles.cActions}>
                                    <button
                                        type="button"
                                        className={`${styles.btn} ${styles.btnPrimary}`}
                                        onClick={handleAddUser}
                                        disabled={loading || !canAct}
                                    >
                                        {loading
                                            ? "saving…"
                                            : "Add to project"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={styles.statusBar}>
                        {msg && <span>{msg}</span>}
                        {err && (
                            <span
                                style={{
                                    color: "var(--danger, #b3261e)",
                                    marginLeft: msg ? 8 : 0,
                                }}
                            >
                                {err}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InviteUsers;