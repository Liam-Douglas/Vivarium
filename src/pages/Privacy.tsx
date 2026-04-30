export function Privacy() {
  const headingStyle = { color: '#f0ece0' }
  const bodyStyle = { color: '#a8a090' }
  const mutedStyle = { color: '#6a6458' }

  return (
    <div className="flex-1 px-4 py-6 pb-24 md:pb-8 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>Privacy Policy</h1>
      <p className="text-xs mb-6" style={mutedStyle}>Last updated: April 2025</p>

      <div className="flex flex-col gap-4">
        <Section title="Overview" headingStyle={headingStyle} bodyStyle={bodyStyle}>
          Vivarium is a personal collection management app for reptile keepers. We take your privacy seriously. This policy explains what data we collect, how we use it, and your rights.
        </Section>

        <Section title="Data we collect" headingStyle={headingStyle} bodyStyle={bodyStyle}>
          <ul className="flex flex-col gap-1.5">
            <li><strong style={headingStyle}>Account data:</strong> your email address and display name, provided when you sign up.</li>
            <li><strong style={headingStyle}>Collection data:</strong> animals, feeding logs, weight records, shedding events, health notes, breeding records, acquisition and exit records, expenses, and feeder inventory that you enter into the app.</li>
            <li><strong style={headingStyle}>Household data:</strong> your household name and the list of members in your shared collection.</li>
            <li><strong style={headingStyle}>Usage data:</strong> basic technical logs (e.g. error traces) used to diagnose bugs. We do not use third-party analytics trackers.</li>
          </ul>
        </Section>

        <Section title="How we use your data" headingStyle={headingStyle} bodyStyle={bodyStyle}>
          <ul className="flex flex-col gap-1.5">
            <li>To provide and operate the Vivarium service, including real-time sync across household members.</li>
            <li>To send transactional emails (e.g. password reset, account verification).</li>
            <li>To notify you about Pro plan availability if you joined the waiting list.</li>
            <li>We do not sell, rent, or share your data with third parties for marketing purposes.</li>
          </ul>
        </Section>

        <Section title="Data storage" headingStyle={headingStyle} bodyStyle={bodyStyle}>
          Your data is stored in a PostgreSQL database hosted by Supabase. Data is encrypted at rest and in transit. Supabase infrastructure is hosted on AWS. For details, see{' '}
          <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#8fbe5a' }}>Supabase's privacy policy</a>.
        </Section>

        <Section title="Household sharing" headingStyle={headingStyle} bodyStyle={bodyStyle}>
          When you join or create a shared household, all members of that household can view the collection data you enter. Household owners can see which member logged each activity. Only the owner can add or remove members.
        </Section>

        <Section title="Data retention and deletion" headingStyle={headingStyle} bodyStyle={bodyStyle}>
          Your data is retained for as long as your account is active. To request deletion of your account and all associated data, contact us at the email address below. We will process deletion requests within 30 days.
        </Section>

        <Section title="Your rights" headingStyle={headingStyle} bodyStyle={bodyStyle}>
          You have the right to access, correct, or delete your personal data at any time. You can update your display name directly in Settings. For other requests, contact us at{' '}
          <a href="mailto:privacy@vivarium.app" style={{ color: '#8fbe5a' }}>privacy@vivarium.app</a>.
        </Section>

        <Section title="Changes to this policy" headingStyle={headingStyle} bodyStyle={bodyStyle}>
          We may update this policy from time to time. Material changes will be communicated via the app or by email. Continued use of Vivarium after changes take effect constitutes acceptance of the revised policy.
        </Section>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
  headingStyle,
  bodyStyle,
}: {
  title: string
  children: React.ReactNode
  headingStyle: React.CSSProperties
  bodyStyle: React.CSSProperties
}) {
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
      <h2 className="text-sm font-semibold mb-3" style={headingStyle}>{title}</h2>
      <div className="text-sm leading-relaxed" style={bodyStyle}>{children}</div>
    </div>
  )
}
