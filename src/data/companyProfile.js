// ── Mabishion company profile — single source of truth for ALL client-facing
// contact details (Owner-provided 2026-07-18). Workers/PDFs/READMEs must import
// from here; never hardcode contact info again. Fields the owner has not set up
// yet are null — render "on request" style fallbacks, never invent values.
export const COMPANY = {
  name: 'Mabishion',
  tagline: 'Architects of Ambition',
  website: 'https://mabishion.wuaze.com/',
  email: 'mabishion@gmail.com',
  phone: '+91-9971766922',
  whatsappLink: 'https://wa.me/919971766922', // click-to-chat, derived from the phone above
  facebook: 'https://facebook.com/mabishion',
  instagram: 'https://instagram.com/mabishion',
  twitter: 'https://x.com/mabishion',
  linkedin: null, // not created yet (owner 2026-07-18)
  upiId: null,    // not provided — show "UPI: On request", do NOT invent
};
