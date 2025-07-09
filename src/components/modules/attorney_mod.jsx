import React, {useState} from "react";
// css
import "./attorney_mod.css";

// icons
import linkedin from "../../assets/icons/linkedin.png";
import worldwideweb from "../../assets/icons/www.png";
import briefcase from "../../assets/icons/briefcase.png";
import mail from "../../assets/icons/mail.png";
import pin from "../../assets/icons/pin.png";
import phone from "../../assets/icons/phone-call.png";

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
    tags
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
                    <div className="attorney-image-main-container">
                        <img className="attorney-headshot" alt="attorney-headshot" src={image}/>
                    </div>
                    <div className="basics-attorney-name-links">
                        <div className="attorney-name">{name}</div>
                        <div className="attorney-links">
                            {linkedinURL && (
                                <a className="attorney-linkedin-hyperlink" href={linkedinURL}>
                                    <img className="attorney-linkedin" alt="attorney-linkedin" src={linkedin} />
                                </a>
                            )}
                            {websiteURL && (
                                <a className="attorney-website-hyperlink" href={websiteURL}>
                                    <img className="attorney-website" alt="attorney-website" src={worldwideweb} />
                                </a>
                            )}
                        </div>
                        <div className="attorney-jd-year">JD Year: {jdYear}</div>
                    </div>
                </div>
                <div className="basics-hemisphere-two">
                    <div className="attorney-location">
                        <img className="attorney-location-icon" alt="attorney-location-icon" src={pin} />
                        {location}
                    </div>
                    <div className="attorney-current-workplace">
                        <img className="attorney-work-icon" alt="attorney-work-icon" src={briefcase} />
                        {currentWorkplace}
                    </div>
                    <div className="attorney-phone-number">
                        <img className="attorney-phone-icon" alt="attorney-phone-icon" src={phone} />
                        {phoneNumber}
                    </div>
                    <div className="attorney-email">
                        <img className="attorney-email-icon" alt="attorney-email-icon" src={mail} />
                        {email}
                    </div>
                </div>
            </div>
            <div className="summary-main-container">{summary}</div>
            <div className={showAllTags ? "tags-main-container-reveal" : "tags-main-container"}>
                {tags && displayedTags.map((tag, index) => (
                    <div key={index} className="attorney-tag">
                        {tag.value}
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
    )
};

export default AttorneyModule;