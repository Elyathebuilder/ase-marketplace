# Bazari brand

## Name

**Bazari**, always in Latin letters, in every language (see the glossary for how endings attach).
Order numbers keep their `ASE-` prefix so existing orders, payment references and links stay valid.

## Logo

Black serif letters, with brand red rosettes set into the two bowls of the B. Built from the owner's concept:
the serif wordmark and the ornamented B are kept; the red pattern that sat behind "azari" is left out so the
letters stay black on a plain background and the ornament lives only in the B.

How it is constructed (`tools/brand/build_logo.py`, all numbers exact):

- "azari" is Noto Serif ExtraBold (SIL Open Font License) converted to outlines, so no font is needed.
- The B is drawn to match: same 180-unit stem and serif brackets as Noto Serif, and every horizontal stroke
  (top, waist, bottom) the same 66 units.
- Both counters are the same size: a square with a semicircle on the right. The rosette is centred on that
  semicircle, so the gap between ornament and letter is the same 26 units at the top, bottom, left and right,
  and the upper and lower rosettes sit on one vertical axis.
- The lower bowl is slightly fuller on the outside than the upper one, as in a classical B, without changing
  the counters.
- The rosette is an eight-pointed star of two squares. It has three levels of detail, chosen by size:
  - **full**: star outline holding a sharp eight-pointed sun with an open centre. Above ~100 px cap height, print.
  - **mid**: solid star with an open centre. 40–100 px.
  - **small**: solid star. Website header, favicon, anything under 40 px.

## Colours (from `src/app/globals.css`)

| Use | Colour |
|---|---|
| Letters | ink `#17171a` |
| Rosettes | brand red `#b3122a` (red-600) |
| Rosettes on near-black | red-500 `#c8202f`, one step lighter so the ornament still reads |
| Icon background | paper `#faf8f4` |

## Files

| File | Use |
|---|---|
| `public/brand/bazari-logo.svg` | Full colour, on light backgrounds |
| `public/brand/bazari-logo-reverse.svg` | White letters, red rosettes, on dark backgrounds |
| `public/brand/bazari-logo-mono.svg` | One colour (black) for stamps, fax, one-colour print |
| `public/brand/bazari-logo-white.svg` | One colour (white) on photos or dark colour |
| `public/brand/bazari-mark.svg` | The B alone, transparent background |
| `public/brand/bazari-app-icon.svg`, `bazari-profile-1024.png` | App icon, social media profile picture |
| `public/brand/bazari-og.png` | Link preview (1200 × 630) |
| `src/app/icon.svg`, `src/app/apple-icon.png` | Favicon and iPhone home-screen icon |
| `src/components/Logo.tsx` | The logo on the website (inline SVG from `src/components/brand/paths.ts`) |

To change the logo, edit `tools/brand/build_logo.py` and run it; it rewrites every file above.

## Use

- Keep clear space around the logo of at least the height of the lowercase "a".
- Smallest size for the full wordmark: 18 px cap height on screen, 6 mm wide in print. Below that, use the B alone.
- Don't recolour the letters red, add shadows or gradients, or put the logo on a busy photo without a plain panel.
