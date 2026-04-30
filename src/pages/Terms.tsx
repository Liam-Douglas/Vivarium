export function Terms() {
  const headingStyle = { color: '#f0ece0' }
  const bodyStyle = { color: '#a8a090' }
  const mutedStyle = { color: '#6a6458' }

  return (
    <div className="flex-1 px-4 py-6 pb-24 md:pb-8 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>Terms of Service</h1>
      <p className="text-xs mb-6" style={mutedStyle}>Last updated: April 2025</p>

      <div className="flex flex-col gap-4">
        <Section title="Acceptance of terms" headingStyle={headingStyle} bodyStyle={bodyStyle}>
          By creating an account or using Vivarium, you agree to these Terms of Service. If you do not agree, do not use the app. We may update these terms at any time; continued use after changes constitutes acceptance.
        </Section>

        <Section title="The service" headingStyle={headingStyle} bodyStyle={bodyStyle}>
          Vivarium is a collection management app designed for reptile keepers. It allows you to track animals, feeding schedules, weight and health records, feeder inventory, and expenses, and to share that data with household members in real time.
        </Section>

        <Section title="Accounts" headingStyle={headingStyle} bodyStyle={bodyStyle}>
          <ul className="flex flex-col gap-1.5">
            <li>You must be at least 13 years old to create an account.</li>
            <li>You are responsible for keeping your login credentials secure.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>You must provide accurate information when signing up.</li>
          </ul>
        </Section>

        <Section title="Free plan limits" headingStyle={headingStyle} bodyStyle={bodyStyle}>
          The free plan supports up to 5 animals per household. If you reach this limit, you will be prompted to upgrade to a Pro plan when it becomes available. Existing data will not be deleted when you reach the limit.
        </Section>

        <Section title="Acceptable use" headingStyle={headingStyle} bodyStyle={bodyStyle}>
          You agree not to:
          <ul className="flex flex-col gap-1.5 mt-2">
            <li>Use the service for any unlawful purpose.</li>
            <li>Attempt to gain unauthorised access to other users' data.</li>
            <li>Reverse-engineer, scrape, or otherwise extract data from the service in bulk.</li>
            <li>Use the service to store data unrelated to animal collection management.</li>
          </ul>
        </Section>

        <Section title="Your data" headingStyle={headingStyle} bodyStyle={bodyStyle}>
          You retain ownership of all data you enter into Vivarium. By using the service you grant us a limited licence to store, process, and display that data for the purpose of providing the service to you and your household members. We do not claim ownership of your data and will not use it for purposes beyond operating the service.
        </Section>

        <Section title="Household sharing" headingStyle={headingStyle} bodyStyle={bodyStyle}>
          When you create or join a household, all active members can view and contribute to the shared collection. The household owner is responsible for managing member access. You agree not to share invite codes publicly in a way that would allow unknown parties to join your household.
        </Section>

        <Section title="Availability" headingStyle={headingStyle} bodyStyle={bodyStyle}>
          We aim to keep Vivarium available at all times but do not guarantee uninterrupted access. We may perform maintenance, add or remove features, or temporarily suspend the service. We are not liable for any losses resulting from downtime or service changes.
        </Section>

        <Section title="Limitation of liability" headingStyle={headingStyle} bodyStyle={bodyStyle}>
          Vivarium is provided "as is" without warranty of any kind. To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the service, including loss of data.
        </Section>

        <Section title="Termination" headingStyle={headingStyle} bodyStyle={bodyStyle}>
          You may delete your account at any time by contacting us. We reserve the right to suspend or terminate accounts that violate these terms. Upon termination, your data will be deleted in accordance with our Privacy Policy.
        </Section>

        <Section title="Contact" headingStyle={headingStyle} bodyStyle={bodyStyle}>
          Questions about these terms? Contact us at{' '}
          <a href="mailto:support@vivarium.app" style={{ color: '#8fbe5a' }}>support@vivarium.app</a>.
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
