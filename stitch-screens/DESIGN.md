RobinPay Design System
A minimal, black-and-white, hand-sketched design language. Everything should feel like a clean pen-and-paper wireframe, not a polished corporate site.
1. Brand & Personality


Product: RobinPay, a developer-first crypto payment gateway on Robinhood Chain.

Voice: confident, clear, developer-friendly. Short sentences. No hype words.

Feel: a smart engineer's notebook. Imperfect on purpose, but always readable and aligned.

Pages covered: Landing (navbar, hero, how it works, footer). Extend to checkout and dashboard with the same rules.
2. Color
Strictly monochrome. No accent colors, gradients, shadows, or transparency effects.
Token Hex Use --paper #FAFAFA Page background --ink #0A0A0A Text, borders, icons, solid buttons --ink-soft #525252 Secondary text, captions --graphite #E5E5E5 Dashed lines, subtle fills, hover backgrounds --white #FFFFFF Card surface, text on solid black
Rules


Text on --paper is always --ink. Text on solid ink is --white.

Never use pure gray for body text below 4.5:1 contrast. --ink-soft is for captions only.

Status is communicated with icons and words, never color (checkmark doodle = success, cross doodle = error).
3. Typography
Role Font Fallback Size / Line height Display / headings Caveat Brush (or Patrick Hand) cursive H1 64/68, H2 44/50, H3 28/34 Body JetBrains Mono ui-monospace, monospace 16/26 Small / captions JetBrains Mono monospace 13/20 Code JetBrains Mono monospace 14/22 Buttons / labels Patrick Hand cursive 18/24
Rules


Headings use the handwritten font, sentence case, never all caps.

Body copy stays in monospace, max line length about 70 characters.

Emphasize with a hand-drawn underline or circle doodle, not bold or color.

Mobile: H1 40/46, H2 32/38, H3 24/30.
4. Spacing, Grid & Layout


Base unit: 8px. Scale: 4, 8, 16, 24, 32, 48, 64, 96, 128.

Max content width: 1100px, centered, with 24px side padding on mobile and 48px on desktop.

Section vertical padding: 96px desktop, 64px mobile.

Grid: 12 columns desktop, 4 columns mobile, 24px gutter.

Breakpoints: mobile < 640px, tablet 640-1023px, desktop >= 1024px.

Generous white space. One idea per section. Centered alignment for headings, left alignment for body text.
5. The Sketch Effect (core of the style)
5.1 Borders


Weight: 2px solid --ink (3px for primary emphasis).

Never use perfectly straight rectangles. Use uneven radii to mimic a pen stroke:
.sketch-box {
  border: 2px solid var(--ink);
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
  background: var(--white);
}
.sketch-box--alt {
  border-radius: 15px 225px 15px 255px / 255px 15px 225px 15px;
}



Alternate between --alt variants across neighboring elements so nothing looks stamped.

Optional roughen filter for borders and icons (use sparingly, 1 to 2 px displacement):
<svg width="0" height="0">
  <filter id="rough">
    <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="2"/>
  </filter>
</svg>

5.2 Hand-drawn decorations


Underlines: squiggly line under key words (once per section at most).

Arrows: curved, dashed, with an open arrowhead, connecting related items.

Doodles: stars, circles, sparkles, small coins. Keep them sparse and always black line art.

Slight rotation on cards: between -1.5deg and 1.5deg, alternating.

Dashed dividers: 2px dashed var(--ink), never solid thin rules.
5.3 Forbidden


Drop shadows, blur, glow, gradients, glassmorphism, photos, 3D, emoji, any color.
6. Iconography & Illustration


Style: single-weight 2px black line art, rounded caps, slightly uneven, no fills (or a --graphite fill at most).

Size: 24px inline, 48px in step cards, 160 to 320px for hero illustrations.

Hero illustration: sketched browser window with a Pay 49 USDC button, an arrow to a wallet doodle, then an arrow to a checkmark.

Icons for the four modules: coin (Checkout), circular arrows (Subscriptions), document with lock (Invoices & Escrow), stack of wallets (Payroll).
7. Components
7.1 Buttons
Variant Style Primary Solid --ink fill, --white text, sketch radius, 2px ink border, padding 12px 24px Secondary --white fill, --ink text, 2px ink border, sketch radius Text link --ink, hand-drawn underline, no box
States


Hover: translate -2px, -2px and add a hard offset outline (box-shadow: 3px 3px 0 var(--ink), the only allowed shadow, a solid ink offset with no blur) to mimic a sketched double line.

Active: return to 0, 0, no offset.

Focus-visible: 3px dashed var(--ink) outline with 4px offset.

Disabled: --graphite fill, --ink-soft text, dashed border.
7.2 Cards (step cards, module labels)


Surface --white, 2px sketch border, padding 24px, optional 1deg rotation.

Structure: line-art icon, number badge (hand-drawn circle with numeral), heading (H3), body (monospace 16px).

Hover: same offset-outline treatment as buttons.
7.3 Code snippet card


--white background, 2px sketch border, JetBrains Mono 14px.

Three small sketched dots in the top-left like a window, no colored dots.

Syntax emphasis through underline or a dashed box, never color.
<RobinPayButton
  publicKey='pk_live_...'
  amount='49.00'
  token='USDC'
  onSuccess={(p) => console.log(p.txHash)}
/>

7.4 Navbar


Height 72px, transparent on --paper, bottom border 2px dashed var(--ink).

Left: hand-drawn RobinPay wordmark with a doodled coin. Right: links (How it works, Docs, GitHub) and a secondary button Get API Key.

Mobile: links collapse into a sketched hamburger icon opening a full-width paper sheet.
7.5 Inputs (for later pages)


2px sketch border, --white fill, monospace 16px text, 48px height.

Label above in Patrick Hand 18px. Helper text in --ink-soft 13px.

Error: dashed border plus a cross doodle and an error message in --ink.
7.6 Footer


Top border 2px dashed var(--ink), padding 64px 0 32px.

Left: wordmark and tagline Payments, minus the middlemen.

Columns: Product, Developers, Company (H3 in handwriting, links in monospace 14px).

Bottom row: Built on Robinhood Chain with a small doodle, X and GitHub line icons, small copyright line.
8. Page Blueprint (Landing)


Navbar as in 7.4.

Hero: H1 Accept crypto payments in 5 lines of code. (underline doodle under 5 lines), monospace subheadline, two buttons (Start building primary, View demo secondary), right side illustration plus code snippet card.

How it works: H2 with squiggly underline. Four step cards in a row (stacked on mobile) connected by dashed arrows: Create, Pay, Verify, Get notified. Below, a row of four module labels: Checkout, Subscriptions, Invoices & Escrow, Payroll.

Footer as in 7.6.
9. Motion


Subtle and purposeful. Duration 150-250ms, easing ease-out.

Allowed: hover offset on buttons and cards, line-draw animation for arrows and underlines on scroll-in (stroke-dashoffset), a gentle 1px jitter on the hero doodles.

Respect prefers-reduced-motion: disable all of the above except instant state changes.
10. Accessibility


Contrast: --ink on --paper is above 18:1. Keep all text at WCAG AA or better.

Handwritten fonts only for headings and short labels, never for paragraphs.

Every doodle that carries meaning has alt text. Purely decorative doodles use aria-hidden='true'.

Visible focus on every interactive element. Minimum touch target 44 x 44px.

Do not rely on the sketch borders alone to indicate interactivity. Pair them with text labels and hover/focus states.
11. CSS Tokens (copy-paste)
:root {
  --paper: #FAFAFA;
  --ink: #0A0A0A;
  --ink-soft: #525252;
  --graphite: #E5E5E5;
  --white: #FFFFFF;

  --font-display: 'Caveat Brush', 'Patrick Hand', cursive;
  --font-body: 'JetBrains Mono', ui-monospace, monospace;
  --font-label: 'Patrick Hand', cursive;

  --border: 2px solid var(--ink);
  --radius-sketch: 255px 15px 225px 15px / 15px 225px 15px 255px;
  --radius-sketch-alt: 15px 225px 15px 255px / 255px 15px 225px 15px;

  --space-1: 4px;  --space-2: 8px;  --space-3: 16px;
  --space-4: 24px; --space-5: 32px; --space-6: 48px;
  --space-7: 64px; --space-8: 96px; --space-9: 128px;
}

12. Do and Don't
Do Don't Keep it black, white, and light gray only Add accent colors or gradients Use uneven, hand-drawn borders and slight rotations Use perfect rectangles and sharp corners Use dashed lines and doodle arrows to connect ideas Use solid thin divider rules or heavy shadows Write short, direct copy Write long marketing paragraphs Use sparse doodles for emphasis Cover the page in decoration