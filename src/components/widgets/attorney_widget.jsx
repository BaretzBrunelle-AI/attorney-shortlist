import React, { useEffect, useState } from "react";

// modules
import AttorneyModule from "../modules/attorney_mod.jsx";
import api from "../../config/axios_config.jsx";

// css
import "./attorney_widget.css";

const AttorneyWidget = ({ attorneys: attorneysProp }) => {
    const [attorneys, setAttorneys] = useState([]);

    const processList = (data) =>
        data.map((attorney) => {
            const safeName = (attorney?.name || "").trim();
            const nameKey = safeName.replace(/\s+/g, "_") + "_headshot";

            let imageURL;
            const cachedImage = localStorage.getItem(nameKey);

            if (cachedImage && cachedImage === attorney.image) {
                imageURL = cachedImage;
            } else if (attorney.image) {
                imageURL = attorney.image;
                localStorage.setItem(nameKey, imageURL);
            } else {
                imageURL = undefined;
            }

            return { ...attorney, image: imageURL };
        });

    useEffect(() => {
        // If external data provided, use it
        if (Array.isArray(attorneysProp) && attorneysProp.length > 0) {
            setAttorneys(processList(attorneysProp));
            return;
        }

        // Otherwise fetch from backend
        const fetchAttorneys = async () => {
            try {
                const response = await api.get("/dashboard/get-attorneys-user");
                const data = response.data || [];
                setAttorneys([]);   // TODO: remove after testing
                return;
                setAttorneys(processList(data));
            } catch (err) {
                console.error("Error fetching attorneys:", err);
            }
        };

        fetchAttorneys();
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
                />

            ))}
        </div>
    );
};

export default AttorneyWidget;
