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
    "I've been drawing on and off for about four years, mostly in sketchbooks. A lot of what hangs here are studies: I copy pages and panels from manga and comics I love to learn how those artists build a face, an expression or a burst of motion. The rest is fan art of characters I keep coming back to.\n\nEvery piece is credited to the series or creator it comes from.",

  pieces: [
    {
      image: "art/the-maxx.jpg",
      title: "The Maxx",
      year: "2025–26",
      medium: "Digital ink",
      story: "Fan art of The Maxx, created by Sam Kieth.",
      alt: "Black-and-white digital ink drawing of a hulking, clawed figure crouched against a round white glow inside a heavy black frame."
    },
    {
      image: "art/wolverine-snikt-collage.jpg",
      title: "Wolverine Snikt! Collage",
      year: "2025–26",
      medium: "Graphite on paper",
      story: "Study after Wolverine: Snikt! by Tsutomu Nihei.",
      alt: "Pencil collage of spiky-haired figures in long coats, one baring claws in the foreground."
    },
    {
      image: "art/hajime-no-ippo-sketches.jpg",
      title: "Hajime no Ippo Sketches",
      year: "2025–26",
      medium: "Ink pen on paper",
      story: "Study after Hajime no Ippo by George Morikawa.",
      alt: "Ink page of three stacked boxing panels drawn with dense hatching and speed lines, building to a knockout punch."
    },
    {
      image: "art/gambit-rogue-profiles.jpg",
      title: "Gambit & Rogue Profiles",
      year: "2025–26",
      medium: "Graphite on paper",
      story: "Study of Gambit and Rogue from Marvel's X-Men.",
      alt: "Pencil sketch of two faces in profile, one looking ahead and one below it gazing upward, with construction lines still visible."
    },
    {
      image: "art/beta-ray-bill.jpg",
      title: "Beta Ray Bill",
      year: "2025–26",
      medium: "Ink pen on paper",
      story: "Study of Beta Ray Bill, created by Walt Simonson for Marvel.",
      alt: "Ink drawing of a horned, caped figure with a fur collar lunging toward the viewer, with a small pencil sketch above."
    },
    {
      image: "art/wolverine.jpg",
      title: "Wolverine",
      year: "2025–26",
      medium: "Graphite on paper",
      story: "Study of Wolverine (Marvel).",
      alt: "Detailed pencil drawing of a tiger-striped figure with long claws crouched on top of a tree stump."
    },
    {
      image: "art/baki.jpg",
      title: "Baki",
      year: "2025–26",
      medium: "Graphite on paper",
      story: "Fan art of Baki, from Baki the Grappler by Keisuke Itagaki.",
      alt: "Pencil sketch of a scowling face with messy hair, surrounded by partial head studies."
    },
    {
      image: "art/rammatra.jpg",
      title: "Rammatra",
      year: "2025–26",
      medium: "Graphite on paper",
      story: "Fan art of Rammatra.",
      alt: "Pencil drawing of an armored figure with a riveted helmet and hair sweeping back."
    },
    {
      image: "art/akira-collage.jpg",
      title: "Akira Collage",
      year: "2025–26",
      medium: "Graphite on paper",
      story: "Study after Akira by Katsuhiro Otomo.",
      alt: "Pencil collage of a figure bursting apart at the top of the page and two faces below, one in glasses and one screaming."
    }
  ]
};
