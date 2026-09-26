import os
from PIL import Image, ImageDraw

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')

svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF6B6B" />
      <stop offset="50%" stop-color="#FF5A5F" />
      <stop offset="100%" stop-color="#E03E48" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#7A0008" flood-opacity="0.2" />
    </filter>
  </defs>

  <!-- Squircle Base -->
  <rect width="512" height="512" rx="120" ry="120" fill="url(#bgGrad)" />

  <!-- Teddy Bear Face Group -->
  <g filter="url(#shadow)">
    <!-- Left Ear -->
    <circle cx="160" cy="154" r="52" fill="#FFFFFF" />
    <circle cx="160" cy="154" r="28" fill="#FFCCD0" />

    <!-- Right Ear -->
    <circle cx="352" cy="154" r="52" fill="#FFFFFF" />
    <circle cx="352" cy="154" r="28" fill="#FFCCD0" />

    <!-- Head -->
    <ellipse cx="256" cy="259" rx="146" ry="132" fill="#FFFFFF" />

    <!-- Eyes -->
    <circle cx="204" cy="229" r="15" fill="#0F172A" />
    <circle cx="209" cy="224" r="5" fill="#FFFFFF" />

    <circle cx="308" cy="229" r="15" fill="#0F172A" />
    <circle cx="313" cy="224" r="5" fill="#FFFFFF" />

    <!-- Cheeks (Blush) -->
    <ellipse cx="180" cy="269" rx="20" ry="11" fill="#FFB3B8" opacity="0.85" />
    <ellipse cx="332" cy="269" rx="20" ry="11" fill="#FFB3B8" opacity="0.85" />

    <!-- Muzzle / Snout -->
    <ellipse cx="256" cy="292" rx="60" ry="46" fill="#FFF1F2" />

    <!-- Nose -->
    <path d="M 238 274 C 238 264, 274 264, 274 274 C 274 286, 256 292, 256 292 C 256 292, 238 286, 238 274 Z" fill="#0F172A" />

    <!-- Mouth -->
    <path d="M 256 292 L 256 302 M 238 304 Q 256 318 256 302 Q 256 318 274 304" fill="none" stroke="#0F172A" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
  </g>
</svg>
'''

# Save SVG
svg_path = os.path.join(FRONTEND_DIR, 'favicon.svg')
with open(svg_path, 'w', encoding='utf-8') as f:
    f.write(svg_content.strip())
print(f"Saved: {svg_path}")

# Draw high-res master image with PIL (1024x1024 supersampled)
size = 1024
img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Squircle background
draw.rounded_rectangle([0, 0, size, size], radius=240, fill=(255, 90, 95, 255))

# Teddy Bear Coordinates (centered and scaled by 2 from 512)
# Ears
# Left ear outer (320, 308, r=104)
draw.ellipse([320 - 104, 308 - 104, 320 + 104, 308 + 104], fill=(255, 255, 255, 255))
draw.ellipse([320 - 56, 308 - 56, 320 + 56, 308 + 56], fill=(255, 204, 208, 255))

# Right ear outer (704, 308, r=104)
draw.ellipse([704 - 104, 308 - 104, 704 + 104, 308 + 104], fill=(255, 255, 255, 255))
draw.ellipse([704 - 56, 308 - 56, 704 + 56, 308 + 56], fill=(255, 204, 208, 255))

# Head (512, 518, rx=292, ry=264)
draw.ellipse([512 - 292, 518 - 264, 512 + 292, 518 + 264], fill=(255, 255, 255, 255))

# Eyes (408, 458) & (616, 458), r=30
draw.ellipse([408 - 30, 458 - 30, 408 + 30, 458 + 30], fill=(15, 23, 42, 255))
draw.ellipse([418 - 10, 448 - 10, 418 + 10, 448 + 10], fill=(255, 255, 255, 255))

draw.ellipse([616 - 30, 458 - 30, 616 + 30, 458 + 30], fill=(15, 23, 42, 255))
draw.ellipse([626 - 10, 448 - 10, 626 + 10, 448 + 10], fill=(255, 255, 255, 255))

# Cheeks (360, 538) & (664, 538), rx=40, ry=22
draw.ellipse([360 - 40, 538 - 22, 360 + 40, 538 + 22], fill=(255, 179, 184, 210))
draw.ellipse([664 - 40, 538 - 22, 664 + 40, 538 + 22], fill=(255, 179, 184, 210))

# Snout (512, 584), rx=120, ry=92
draw.ellipse([512 - 120, 584 - 92, 512 + 120, 584 + 92], fill=(255, 241, 242, 255))

# Nose (512, 548), rx=38, ry=26
draw.ellipse([512 - 38, 548 - 26, 512 + 38, 548 + 26], fill=(15, 23, 42, 255))

# Mouth lines
draw.line([(512, 574), (512, 598)], fill=(15, 23, 42, 255), width=10)
draw.arc([470, 568, 512, 618], start=0, end=140, fill=(15, 23, 42, 255), width=10)
draw.arc([512, 568, 554, 618], start=40, end=180, fill=(15, 23, 42, 255), width=10)

# Generate multi-size icons
sizes = {
    'favicon-16x16.png': (16, 16),
    'favicon-32x32.png': (32, 32),
    'apple-touch-icon.png': (180, 180),
    'android-chrome-192x192.png': (192, 192),
    'android-chrome-512x512.png': (512, 512),
}

for name, s in sizes.items():
    resized = img.resize(s, Image.Resampling.LANCZOS)
    target = os.path.join(FRONTEND_DIR, name)
    resized.save(target, format='PNG')
    print(f"Saved: {target} ({s})")

# Save multi-size favicon.ico (16, 32, 48, 64)
ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
ico_imgs = [img.resize(s, Image.Resampling.LANCZOS) for s in ico_sizes]
ico_path = os.path.join(FRONTEND_DIR, 'favicon.ico')
ico_imgs[0].save(ico_path, format='ICO', sizes=ico_sizes, append_images=ico_imgs[1:])
print(f"Saved: {ico_path} (multi-res ICO)")

# Save site.webmanifest
manifest_content = '''{
  "name": "GRAYKO TOYS",
  "short_name": "GRAYKO",
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "theme_color": "#FF5A5F",
  "background_color": "#F8FAFC",
  "display": "standalone"
}
'''
manifest_path = os.path.join(FRONTEND_DIR, 'site.webmanifest')
with open(manifest_path, 'w', encoding='utf-8') as f:
    f.write(manifest_content.strip())
print(f"Saved: {manifest_path}")
