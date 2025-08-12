import React, { useEffect, useState } from "react";

// modules
import AttorneyModule from "../modules/attorney_mod.jsx";
import api from "../../config/axios_config.jsx";

// css
import "./attorney_widget.css";

const AttorneyWidget = () => {
    const [attorneys, setAttorneys] = useState([]);

    useEffect(() => {
       const fetchAttorneys = async () => {
            try {
                const response = await api.get("/dashboard/get-attorneys");
                const data = response.data;

                const processedData = data.map(attorney => {
                    const nameKey = attorney.name.replace(/\s+/g, "_") + "_headshot";
                    
                    let imageURL;
                    // Check localStorage for existing image URL
                    const cachedImage = localStorage.getItem(nameKey);
                    if (cachedImage && cachedImage === attorney.image) {
                        imageURL = cachedImage;
                    } else {
                        if (attorney.image) {
                            imageURL = attorney.image;
                            localStorage.setItem(nameKey, imageURL);
                        } else {
                            imageURL = ""; // Fallback if no image
                        }
                    }

                    return {
                        ...attorney,
                        image: imageURL
                    };
                });

                setAttorneys(processedData);
            } catch (err) {
                console.error("Error fetching attorneys:", err);
            }
        };

        fetchAttorneys();
    }, []);

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
                />
            ))}
        </div>
    );
};

export default AttorneyWidget;