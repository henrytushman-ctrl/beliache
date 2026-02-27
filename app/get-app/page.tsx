export default function GetAppPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="text-7xl mb-4">🚽</div>
        <h1 className="text-3xl font-black text-foreground mb-2">Get BeliAche</h1>
        <p className="text-muted-foreground">
          Install it on your phone — no App Store needed.
        </p>
      </div>

      {/* iPhone */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-warm">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl">🍎</span>
          <div>
            <h2 className="font-bold text-lg text-foreground">iPhone</h2>
            <p className="text-sm text-muted-foreground">Safari · iOS 16.4+</p>
          </div>
        </div>
        <ol className="space-y-4">
          {[
            { n: 1, icon: "🧭", text: "Open this page in Safari (not Chrome)" },
            { n: 2, icon: "⬆️", text: 'Tap the Share button at the bottom of the screen' },
            { n: 3, icon: "➕", text: 'Scroll down and tap "Add to Home Screen"' },
            { n: 4, icon: "✅", text: 'Tap "Add" — done!' },
          ].map(({ n, icon, text }) => (
            <li key={n} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                {n}
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                <span className="mr-1.5">{icon}</span>{text}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* Android */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-8 shadow-warm">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl">🤖</span>
          <div>
            <h2 className="font-bold text-lg text-foreground">Android</h2>
            <p className="text-sm text-muted-foreground">Chrome</p>
          </div>
        </div>
        <ol className="space-y-4">
          {[
            { n: 1, icon: "🌐", text: "Open this page in Chrome" },
            { n: 2, icon: "⋮", text: 'Tap the three-dot menu in the top right' },
            { n: 3, icon: "➕", text: 'Tap "Add to Home screen"' },
            { n: 4, icon: "✅", text: 'Tap "Add" — done!' },
          ].map(({ n, icon, text }) => (
            <li key={n} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                {n}
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                <span className="mr-1.5">{icon}</span>{text}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* What you get */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
        <h3 className="font-bold text-sm text-primary uppercase tracking-wide mb-3">What you get</h3>
        <ul className="space-y-2">
          {[
            "Home screen icon — looks just like a real app",
            "Full screen with no browser bar",
            "Works on any phone, no App Store required",
            "Always up to date — no manual updates",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-foreground">
              <span className="text-primary font-bold shrink-0">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
