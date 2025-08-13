import React, {useState} from "react";
// css
import "./attorney_mod.css";

// icons
import linkedin from "../../assets/icons/social.png";
import worldwideweb from "../../assets/icons/internet.png";
import briefcase from "../../assets/icons/briefcase.png";
import mail from "../../assets/icons/mail.png";
import pin from "../../assets/icons/pin.png";
import phone from "../../assets/icons/phone-call.png";
import visibility from "../../assets/icons/witness.png";

const AttorneyModule = ({
    name,
    image,
    linkedinURL,
    websiteURL,
    jdYear,
    location,
    currentWorkplace,
    phoneNumber,
    email,
    summary,
    tags,
    visibilityScore,
}) => {

    const [showAllTags, setShowAllTags] = useState(false);

    const displayedTags = showAllTags ? tags : tags.slice(0, 5);
    const remainingCount = tags.length - 5;

    const toggleTags = () => {
        setShowAllTags(!showAllTags);
    };

    return ( 
        <div className="attorney-module-main-container">
            <div className="basics-main-container">
                <div className="basics-hemisphere-one">
                    <div className={visibilityScore ? "attorney-image-main-container-with-visibility" : "attorney-image-main-container"}>
                        <img className="attorney-headshot" alt="attorney-headshot" src={image}/>
                    </div>
                    <div className="basics-attorney-name-links">
                        <div className="attorney-name">{name}</div>
                        <div className="attorney-jd-year">JD Year: {jdYear}</div>
                        <div className="attorney-links">
                            {linkedinURL && (
                                <a 
                                    className="attorney-linkedin-hyperlink" 
                                    href={linkedinURL}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                >
                                    <img className="attorney-linkedin" alt="attorney-linkedin" src={linkedin} />
                                </a>
                            )}
                            {websiteURL && (
                                <a 
                                    className="attorney-website-hyperlink" 
                                    href={websiteURL}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                >
                                    <img className="attorney-website" alt="attorney-website" src={worldwideweb} />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
                <div className="basics-hemisphere-two">
                    <div className="attorney-location">
                        {location}
                        <img className="attorney-location-icon" alt="attorney-location-icon" src={pin} />
                    </div>
                    <div className="attorney-current-workplace">
                        {currentWorkplace}
                        <img className="attorney-work-icon" alt="attorney-work-icon" src={briefcase} />
                    </div>
                    <div className="attorney-phone-number">
                        {phoneNumber}
                        <img className="attorney-phone-icon" alt="attorney-phone-icon" src={phone} />
                    </div>
                    <div className="attorney-email">
                        {email}
                        <img className="attorney-email-icon" alt="attorney-email-icon" src={mail} />
                    </div>
                    {visibilityScore ? (
                        <div className="attorney-visibility-score">
                            Visibility Score: {visibilityScore}
                            <img
                            className="attorney-visibility-icon"
                            alt="visibility-score-icon"
                            src={visibility}
                            />
                        </div>
                    ) : null}
                </div>
            </div>
            <div className="summary-main-container">{summary}</div>
            <div className="attorney-mod-bottom-container">
                <div className={showAllTags ? "tags-main-container-reveal" : "tags-main-container"}>
                    {tags &&
                    [...new Set(displayedTags.map(tag => tag.value))].map((uniqueValue, index) => (
                        <div key={index} className="attorney-tag">
                        {uniqueValue}
                        </div>
                    ))}

                    {remainingCount > 0 && !showAllTags && (
                        <div className="attorney-tag-toggle" onClick={toggleTags}>
                            +{remainingCount} More
                        </div>
                    )}

                    {showAllTags && (
                        <div className="attorney-tag-toggle" onClick={toggleTags}>
                            Hide
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
};

export default AttorneyModule;