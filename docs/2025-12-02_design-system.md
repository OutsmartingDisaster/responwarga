Org_Dashboard Version 1.0 • 

1. Core Philosophy

Dark by Default: Designed for low-light control rooms to reduce eye strain.

Data Density: High information density without clutter, achieved through distinct "Bento-style" grouping.

Depth over Borders: Hierarchy is established using background opacity and blur, not heavy border lines.

Alive Interface: The UI should feel active with subtle pulses and real-time indicators.

2. Color Palette

🌑 Neutrals (Surface & Backgrounds)

The foundation of the interface uses cool, deep slates rather than pure black to maintain depth.

Name

Tailwind Class

Hex

Usage

Void

bg-[#0f172a]

#0f172a

Main application background (Deep Slate).

Glass Low

bg-slate-800/30

#1e293b (30%)

Secondary panels, map overlays.

Glass High

bg-slate-800/50

#1e293b (50%)

Active states, inputs, elevated cards.

Border Sub

border-white/5

rgba(255,255,255,0.05)

Subtle dividers, card borders.

Text Main

text-white

#ffffff

Headings, primary values.

Text Muted

text-slate-400

#94a3b8

Labels, secondary text, icons.

🔵 Primary Brand (Command Blue)

Used for Admin actions, navigation, and primary focus areas.

Name

Tailwind Class

Usage

Action

bg-blue-600

Primary buttons, active tabs.

Glow

shadow-blue-500/20

Soft glow behind active elements.

Text

text-blue-400

Links, clickable icons, highlights.

🚦 Semantic Colors (Status & Alerts)

Critical for emergency contexts. These colors must pop against the dark background.

State

Color

Tailwind Classes

Usage

Critical / Danger

Red

text-red-400, bg-red-500

High-risk zones, SOS, "Critical" badges.

Warning / Caution

Orange

text-orange-400, bg-orange-500

"Medium" priority, fire alerts.

Safe / Success

Green

text-green-400, bg-green-500

"Available" status, resolved tasks, safe zones.

Information

Purple

text-purple-400, bg-purple-500

System stats, automated data.

3. Typography

Font Family: Inter or system-ui sans-serif.
Monospace: JetBrains Mono or system-ui monospace (for IDs and Clocks).

Role

Size

Weight

Tracking

Tailwind Example

Display XL

30px

Bold

Tight

text-3xl font-bold tracking-tight

Heading L

24px

Bold

Normal

text-2xl font-bold

Heading M

18px

Bold

Normal

text-lg font-bold

Body

14px

Regular

Normal

text-sm text-slate-400

Label

12px

Medium

Wide

text-xs font-medium uppercase tracking-wider

Data/Mono

14px

Regular

Normal

text-sm font-mono

4. UI Components

A. The "Glass Card" (Container)

The fundamental building block.

Background: bg-slate-800/40

Blur: backdrop-blur-md

Border: border border-white/5

Radius: rounded-2xl or rounded-3xl

Hover Effect: hover:bg-slate-800/60 hover:border-white/20 transition-all

B. Buttons

Primary: bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 rounded-xl

Secondary/Ghost: bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 rounded-xl

Destructive: bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500 hover:text-white

C. Badges & Tags

Used for status indicators.

Structure: px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider

Style: Background at 10% opacity, border at 20% opacity.

Example (Red): bg-red-500/10 text-red-400 border-red-500/20

D. Navigation Items (Sidebar)

Inactive: text-slate-400 hover:bg-white/5 hover:text-white

Active: bg-blue-600 text-white shadow-lg shadow-blue-900/20

Detail: Active state often includes an internal glow or gradient background.

5. Effects & Micro-interactions

Glows & Shadows

We do not use standard black drop shadows. We use colored glows to indicate active states.

Blue Glow: shadow-lg shadow-blue-500/20 (Used on primary buttons/active nav).

Red Pulse: animate-pulse shadow-red-500/20 (Used on live emergency markers).

Animations

Pulse (Slow): Used for "Live" indicators.

@keyframes pulse-slow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: .8; transform: scale(1.05); }
}


Transitions: All hover states use transition-all duration-300 ease-in-out.

Background Blurs

Nav/Overlay: backdrop-blur-md (Standard blur).

Map Overlays: backdrop-blur (Lighter blur to keep map visible).

6. Iconography

Library: Lucide React

Style: Stroke width 2px (Standard), 1.5px (Fine).

Sizing:

Sidebar: 20px

Buttons: 16px or 14px

Stats: 20px inside a p-2.5 container.

7. Layout Patterns

The "Bento" Grid

Instead of a single scrolling page, the dashboard is composed of fixed-height widgets arranged in a grid.

Gap: gap-4 (Standard), gap-6 (Section separation).

Scrollbars: Custom styling is mandatory.

Width: 5px

Track: Transparent

Thumb: rgba(255,255,255,0.1) rounded.

Sidebar

Width: w-72 (Expanded), w-20 (Collapsed).

Behavior: Fixed position, independent scroll.