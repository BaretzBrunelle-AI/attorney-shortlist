import React, { useEffect, useMemo, useRef, useState } from "react";
import AttorneyModule from "../attorney_mod/attorney_mod.jsx";
import api from "../../../config/axios_config.jsx";
import "./attorney_widget.css";

const SORTS = [
    { key: "default", label: "Default" },
    { key: "name", label: "Name" },
    { key: "jd", label: "JD Year" },
    { key: "location", label: "Location" },
    { key: "workplace", label: "Workplace" },
    { key: "visibility", label: "Visibility Score" },
];

const AttorneyWidget = ({ attorneys: attorneysProp, project }) => {
    const [attorneys, setAttorneys] = useState([]);
    const [availableTags, setAvailableTags] = useState({ tags: [], keys: [], valuesByKey: {} });

    // control bar state
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState("default");
    const [sortDir, setSortDir] = useState("asc");
    const [selectedTagPairs, setSelectedTagPairs] = useState([]);
    const [tagMatchMode, setTagMatchMode] = useState("any");
    const [tagMenuOpen, setTagMenuOpen] = useState(false);
    const tagMenuRef = useRef(null);

    // fetch all unique tags for the selected project
    useEffect(() => {
        const fetchTags = async () => {
            const { data } = await api.get("/admin/projects/get-available-tags", {
                params: { project_name: project },
                admin: true,
            });
            console.log(data)
            setAvailableTags(data || { tags: [], keys: [], valuesByKey: {} });
        };
        if (project) fetchTags();
    }, [project]);

    // close dropdown when clicking outside
    useEffect(() => {
        const onDown = (e) => {
            if (!tagMenuOpen) return;
            if (tagMenuRef.current && !tagMenuRef.current.contains(e.target)) {
                setTagMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [tagMenuOpen]);

    // initial normalization + default sorting (your original baseline)
    const tierOrder = new Map([
        ["marquee", 0],
        ["first class", 1],
        ["wild card", 2],
    ]);
    const rankTier = (tier) => tierOrder.get((tier || "").toLowerCase().trim()) ?? 999;
    const compareCI = (a, b) => (a || "").localeCompare(b || "", undefined, { sensitivity: "base" });

    const processList = (data) => {
        const sorted = data
            .map((attorney) => {
                const safeName = (attorney?.name || "").trim();
                const nameKey = safeName.replace(/\s+/g, "_") + "_headshot";

                let imageURL;
                const cached = localStorage.getItem(nameKey);
                if (cached && cached === attorney.image) imageURL = cached;
                else if (attorney.image) {
                    imageURL = attorney.image;
                    localStorage.setItem(nameKey, imageURL);
                }

                const filteredTags = Array.isArray(attorney.tags)
                    ? attorney.tags.filter((t) => t.key !== "Status")
                    : [];

                return { ...attorney, image: imageURL, tags: filteredTags };
            })
            .sort((a, b) => {
                const ta = rankTier(a.tier);
                const tb = rankTier(b.tier);
                if (ta !== tb) return ta - tb;

                const fa = (a.current_workplace || "").trim();
                const fb = (b.current_workplace || "").trim();
                const aEmpty = fa === "";
                const bEmpty = fb === "";
                if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
                const firmCmp = compareCI(fa, fb);
                if (firmCmp !== 0) return firmCmp;

                return compareCI(a.name, b.name);
            });

        return sorted;
    };

    useEffect(() => {
        if (Array.isArray(attorneysProp) && attorneysProp.length > 0) {
            setAttorneys(processList(attorneysProp));
            return;
        }

        const fetchAttorneys = async () => {
            try {
                const { data = [] } = await api.get("/dashboard/get-attorneys-user");
                setAttorneys(processList(data));
            } catch (err) {
                console.error("Error fetching attorneys:", err);
            }
        };

        // fetchAttorneys(); // enable when ready
    }, [attorneysProp]);

    // tag helpers
    const isSelected = (k, v) => selectedTagPairs.some((p) => p.key === k && p.value === v);
    const toggleTag = (k, v) => {
        setSelectedTagPairs((prev) => {
            const exists = prev.some((p) => p.key === k && p.value === v);
            return exists ? prev.filter((p) => !(p.key === k && p.value === v)) : [...prev, { key: k, value: v }];
        });
    };
    const clearTags = () => setSelectedTagPairs([]);

    // flatten + group available tags for dropdown
    const groupedTags = useMemo(() => {
        // Prefer the server-provided grouped map
        const vByK = availableTags?.valuesByKey;
        if (vByK && typeof vByK === "object") {
            return Object.keys(vByK)
                .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
                .map(k => ({
                    key: k,
                    values: (vByK[k] || []).slice().sort((a, b) => (a || "").localeCompare(b || "", undefined, { sensitivity: "base" })),
                }));
        }

        // Fallback: handle tags as strings "key:value" (or legacy objects)
        const arr = Array.isArray(availableTags?.tags) ? availableTags.tags : [];
        const groups = new Map();

        for (const t of arr) {
            if (typeof t === "string") {
                const idx = t.indexOf(":");
                const k = idx >= 0 ? t.slice(0, idx) : t;
                const v = idx >= 0 ? t.slice(idx + 1) : "";
                if (!groups.has(k)) groups.set(k, new Set());
                groups.get(k).add(v);
            } else if (t && typeof t === "object") {
                const k = t.key ?? "";
                const v = t.value ?? "";
                if (!groups.has(k)) groups.set(k, new Set());
                groups.get(k).add(v);
            }
        }

        const out = [];
        for (const [k, setVals] of groups) {
            out.push({
                key: k,
                values: Array.from(setVals).sort((a, b) => (a || "").localeCompare(b || "", undefined, { sensitivity: "base" })),
            });
        }
        out.sort((a, b) => a.key.localeCompare(b.key, undefined, { sensitivity: "base" }));
        return out;
    }, [availableTags]);

    // derived: filter → sort
    const filteredAndSorted = useMemo(() => {
        let list = [...attorneys];

        // search
        const q = (search || "").trim().toLowerCase();
        if (q) {
            list = list.filter((a) => {
                const hay = [
                    a.name,
                    a.email,
                    a.phone_number,
                    a.location,
                    a.current_workplace,
                    ...(Array.isArray(a.tags) ? a.tags.map((t) => `${t.key}:${t.value}`) : []),
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                return hay.includes(q);
            });
        }

        // tag filters
        if (selectedTagPairs.length) {
            list = list.filter((a) => {
                const tags = Array.isArray(a.tags) ? a.tags : [];
                if (tagMatchMode === "any") {
                    return selectedTagPairs.some((sel) => tags.some((t) => t.key === sel.key && t.value === sel.value));
                }
                // all
                return selectedTagPairs.every((sel) => tags.some((t) => t.key === sel.key && t.value === sel.value));
            });
        }

        // sort
        const dir = sortDir === "asc" ? 1 : -1;
        list.sort((a, b) => {
            let A, B;
            switch (sortKey) {
                case "name":
                    A = a.name || "";
                    B = b.name || "";
                    return A.localeCompare(B, undefined, { sensitivity: "base" }) * dir;
                case "jd": {
                    const na = parseInt(a.grad_year, 10);
                    const nb = parseInt(b.grad_year, 10);
                    const aa = Number.isFinite(na) ? na : (sortDir === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
                    const bb = Number.isFinite(nb) ? nb : (sortDir === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
                    return (aa - bb) * dir;
                }
                case "location":
                    A = a.location || "";
                    B = b.location || "";
                    return A.localeCompare(B, undefined, { sensitivity: "base" }) * dir;
                case "workplace":
                    A = a.current_workplace || "";
                    B = b.current_workplace || "";
                    return A.localeCompare(B, undefined, { sensitivity: "base" }) * dir;
                case "visibility": {
                    const va = Number(a.visibility_score);
                    const vb = Number(b.visibility_score);
                    const aa = Number.isFinite(va) ? va : (sortDir === "asc" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY);
                    const bb = Number.isFinite(vb) ? vb : (sortDir === "asc" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY);
                    return (aa - bb) * dir;
                }
                default:
                    return 0;
            }
        });

        return list;
    }, [attorneys, search, selectedTagPairs, tagMatchMode, sortKey, sortDir]);

    return (
        <div className="attorney-widget-main-container">
            {/* Control Bar */}
            {project && (
                <div className="aw-controls">
                    {/* Search */}
                    <input
                        className="aw-input"
                        type="text"
                        placeholder="Search attorneys…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button className="aw-btn" disabled={!search} onClick={() => setSearch("")}>Clear</button>

                    {/* Sort */}
                    <div className="aw-sort">
                        <label className="aw-label">Sort: </label>
                        <select className="aw-select" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                            {SORTS.map((s) => (
                                <option key={s.key} value={s.key}>{s.label}</option>
                            ))}
                        </select>
                        <button
                            className="aw-btn"
                            title="Toggle sort direction"
                            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                        >
                            {sortDir === "asc" ? "↑" : "↓"}
                        </button>
                    </div>

                    {/* Tag filter dropdown */}
                    <div className="aw-dropdown" ref={tagMenuRef}>
                        <button
                            className="aw-btn"
                            onClick={() => setTagMenuOpen((o) => !o)}
                            aria-expanded={tagMenuOpen}
                            aria-haspopup="listbox"
                        >
                            Filter Tags {selectedTagPairs.length ? `(${selectedTagPairs.length})` : ""}
                        </button>

                        {tagMenuOpen && (
                            <div className="aw-filter-dropdown" role="dialog" aria-label="Filter by tags">
                                <div className="aw-filter-row">
                                    <label className="aw-label">Match</label>
                                    <select
                                        className="aw-select"
                                        value={tagMatchMode}
                                        onChange={(e) => setTagMatchMode(e.target.value)}
                                    >
                                        <option value="any">ANY</option>
                                        <option value="all">ALL</option>
                                    </select>
                                    <div className="aw-spacer" />
                                    <button className="aw-btn" onClick={clearTags} disabled={!selectedTagPairs.length}>
                                        Clear
                                    </button>
                                </div>

                                <div className="aw-filter-scroll">
                                    {groupedTags.map(({ key, values }) => (
                                        <div key={key} className="aw-group">
                                            <div className="aw-group-title">{key || "(no key)"}</div>
                                            <ul className="aw-options" role="listbox" aria-label={`Values for ${key || "no key"}`}>
                                                {values.map((val) => {
                                                    const checked = isSelected(key, val);
                                                    return (
                                                        <li key={`${key}::${val}`} className="aw-option">
                                                            <label className="aw-option-label">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={() => toggleTag(key, val)}
                                                                />
                                                                <span>{val || "(empty)"}</span>
                                                            </label>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    ))}
                                </div>

                                <div className="aw-actions">
                                    <button className="aw-btn" onClick={() => setTagMenuOpen(false)}>Done</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Cards */}
            <div className="attorney-widget-mod-container">
                {filteredAndSorted.map((attorney, index) => (
                    <AttorneyModule
                        key={`${attorney.attorney_id || index}`}
                        name={attorney.name}
                        image={attorney.image}
                        image_meta={attorney.image_meta}
                        linkedinURL={attorney.linkedin}
                        websiteURL={attorney.website}
                        jdYear={attorney.grad_year}
                        location={attorney.location}
                        currentWorkplace={attorney.current_workplace}
                        phoneNumber={attorney.phone_number}
                        email={attorney.email}
                        summary={attorney.summary}
                        tags={attorney.tags}
                        visibilityScore={attorney.visibility_score}
                        tier={attorney.tier}
                        notes={attorney.notes}
                    />
                ))}
            </div>

        </div>
    );
};

export default AttorneyWidget;