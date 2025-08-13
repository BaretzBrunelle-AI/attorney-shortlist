import React, { useEffect, useState } from "react";

// modules
import AttorneyModule from "../modules/attorney_mod.jsx";
import api from "../../config/axios_config.jsx";

// css
import "./attorney_widget.css";

const AttorneyWidget = ({ attorneys: attorneysProp }) => {
    const [attorneys, setAttorneys] = useState([]);

    const tierOrder = new Map([
        ["marquee", 0],
        ["first class", 1],
        ["wild card", 2],
    ]);
    const rankTier = (tier) => tierOrder.get((tier || "").toLowerCase().trim()) ?? 999;

    const compareCI = (a, b) =>
        (a || "").localeCompare(b || "", undefined, { sensitivity: "base" });

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

        // fetchAttorneys(); // enable when backend endpoint is ready
    }, [attorneysProp]);

    return (
        <div className="attorney-widget-main-container">
            {attorneys.map((attorney, index) => (
                <AttorneyModule
                    key={index}
                    name={attorney.name}
                    image={attorney.image}
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
                />
            ))}
        </div>
    );
};

export default AttorneyWidget;