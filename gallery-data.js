/*
  ──────────────────────────────────────────────────────────────────────
  DAYTON / GALLERY  ·  the only file you need to edit to hang your art
  ──────────────────────────────────────────────────────────────────────

  1. Put your scanned or photographed pieces in the  art/  folder.
     JPG or WebP, about 2000–2400 px on the long edge, under ~800 KB each.

  2. Add one entry per piece below, in the order visitors should walk
     past them. The hallway builds itself from this list: every piece gets
     its own corridor, so adding a piece adds a corridor.

  3. Commit and push.

  Fields (only `image` and `title` really matter):
    image   path to the file, e.g. "art/rooftops.jpg"
            (null shows a generated placeholder until you have the scan)
    title   name of the piece
    year    "2025"
    medium  "Graphite on paper", "Digital · Procreate", ...
    size    physical size, e.g. "9 × 12 in"   (optional, skip for digital)
    story   a few sentences in your own voice. A blank line starts a new paragraph.
    alt     a short description of what the image shows, for screen readers
*/

window.GALLERY = {
  artist: "Dayton Conwell",
  eyebrow: "Works on paper & screen",
  subtitle: "Drawings, sketches and digital pieces. Walk the hall and stop at anything that catches your eye.",
  statement:
    "PLACEHOLDER: replace this with a few sentences about you as an artist. What you draw, what you keep coming back to, and how making art connects to the rest of what you build.\n\nA second paragraph can go here if you want one.",

  pieces: [
    {
      image: null,
      title: "Placeholder 01",
      year: "2025",
      medium: "Graphite on paper",
      size: "9 × 12 in",
      story: "Replace this with the story behind the piece: what it is, when you made it, and what you were trying out.",
      alt: ""
    },
    {
      image: null,
      title: "Placeholder 02",
      year: "2025",
      medium: "Digital · Procreate",
      story: "Replace this with the story behind the piece.",
      alt: ""
    },
    {
      image: null,
      title: "Placeholder 03",
      year: "2024",
      medium: "Ink on paper",
      size: "8.5 × 11 in",
      story: "Replace this with the story behind the piece.",
      alt: ""
    },
    {
      image: null,
      title: "Placeholder 04",
      year: "2024",
      medium: "Digital",
      story: "Replace this with the story behind the piece.",
      alt: ""
    },
    {
      image: null,
      title: "Placeholder 05",
      year: "2024",
      medium: "Charcoal on paper",
      size: "18 × 24 in",
      story: "Replace this with the story behind the piece.",
      alt: ""
    },
    {
      image: null,
      title: "Placeholder 06",
      year: "2023",
      medium: "Digital",
      story: "Replace this with the story behind the piece.",
      alt: ""
    }
  ]
};
