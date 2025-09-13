export default function SchemaMarkup() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    "name": "Union Deportiva Asturiana",
    "alternateName": "UD Asturiana",
    "description": "Club de futsal passionné basé à Bruxelles, né de la fusion entre Spanish Futsal et Sporting Roja.",
    "url": "https://udasturiana.be",
    "logo": "https://udasturiana.be/assets/images/svg/logo-asturiana.svg",
    "sport": "Futsal",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Bruxelles",
      "addressCountry": "BE"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "url": "https://udasturiana.be/contact"
    },
    "sameAs": [
      "https://www.lffs.eu"
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
    />
  );
}