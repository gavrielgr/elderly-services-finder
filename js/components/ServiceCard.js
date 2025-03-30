export function ServiceCard({ service }) {
    const {
        name,
        description,
        contact: { phone = [], email = [], website = [] } = {},
        interestAreas = [],
        city,
        address
    } = service;

    return (
        <div className="service-card">
            <h3>{name}</h3>
            {description && <p className="description">{description}</p>}
            
            <div className="contact-info">
                {phone.length > 0 && (
                    <div className="phone-numbers">
                        <strong>טלפון:</strong>
                        {phone.map((p, i) => (
                            <a key={i} href={`tel:${p.number}`}>{p.number}</a>
                        ))}
                    </div>
                )}
                
                {email.length > 0 && (
                    <div className="email-addresses">
                        <strong>דוא"ל:</strong>
                        {email.map((e, i) => (
                            <a key={i} href={`mailto:${e.address}`}>{e.address}</a>
                        ))}
                    </div>
                )}
                
                {website.length > 0 && (
                    <div className="websites">
                        <strong>אתר:</strong>
                        {website.map((w, i) => (
                            <a key={i} href={w.url} target="_blank" rel="noopener noreferrer">
                                {w.url}
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {interestAreas.length > 0 && (
                <div className="interest-areas">
                    <strong>תחומי עניין:</strong>
                    {interestAreas.map((area, i) => (
                        <span key={i} className="tag">{area}</span>
                    ))}
                </div>
            )}

            {(city || address) && (
                <div className="location">
                    {city && <span className="city">{city}</span>}
                    {address && <span className="address">{address}</span>}
                </div>
            )}
        </div>
    );
} 