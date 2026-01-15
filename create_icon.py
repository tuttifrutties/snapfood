#!/usr/bin/env python3
"""
Snapfood App Icon Generator
Creates a modern, viral-worthy app icon for Google Play Store
"""

from PIL import Image, ImageDraw, ImageFont
import math

def create_snapfood_icon(size=512):
    """Create a modern Snapfood app icon"""
    
    # Create base image with gradient background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Colors - vibrant coral/salmon gradient
    primary_color = (255, 107, 107)  # #FF6B6B - Coral
    secondary_color = (255, 82, 82)  # #FF5252 - Darker coral
    accent_color = (255, 255, 255)   # White
    dark_accent = (40, 40, 40)       # Dark gray
    
    # Create rounded rectangle background with gradient effect
    corner_radius = size // 5  # 20% corner radius for modern look
    
    # Draw gradient background (vertical)
    for y in range(size):
        # Interpolate between colors
        ratio = y / size
        r = int(primary_color[0] * (1 - ratio) + secondary_color[0] * ratio)
        g = int(primary_color[1] * (1 - ratio) + secondary_color[1] * ratio)
        b = int(primary_color[2] * (1 - ratio) + secondary_color[2] * ratio)
        draw.line([(0, y), (size, y)], fill=(r, g, b))
    
    # Create mask for rounded corners
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, size-1, size-1], radius=corner_radius, fill=255)
    
    # Apply rounded corner mask
    img.putalpha(mask)
    
    # Calculate center and icon dimensions
    center_x = size // 2
    center_y = size // 2
    icon_size = int(size * 0.55)  # Icon takes 55% of the space
    
    # Draw fork (left side)
    fork_width = int(icon_size * 0.08)
    fork_height = int(icon_size * 0.65)
    fork_x = center_x - int(icon_size * 0.22)
    fork_y = center_y - int(fork_height * 0.35)
    
    # Fork handle
    handle_height = int(fork_height * 0.45)
    draw.rounded_rectangle(
        [fork_x - fork_width//2, fork_y + fork_height - handle_height,
         fork_x + fork_width//2, fork_y + fork_height],
        radius=fork_width//3,
        fill=accent_color
    )
    
    # Fork prongs (3 prongs)
    prong_gap = int(fork_width * 1.2)
    prong_height = int(fork_height * 0.45)
    prong_width = int(fork_width * 0.7)
    
    for i in range(-1, 2):
        prong_x = fork_x + i * prong_gap
        draw.rounded_rectangle(
            [prong_x - prong_width//2, fork_y,
             prong_x + prong_width//2, fork_y + prong_height],
            radius=prong_width//2,
            fill=accent_color
        )
    
    # Fork connector
    connector_y = fork_y + prong_height - int(fork_width * 0.5)
    draw.rounded_rectangle(
        [fork_x - prong_gap - prong_width//2, connector_y,
         fork_x + prong_gap + prong_width//2, connector_y + int(fork_width * 1.5)],
        radius=fork_width//3,
        fill=accent_color
    )
    
    # Draw knife (right side)
    knife_width = int(icon_size * 0.12)
    knife_height = int(icon_size * 0.65)
    knife_x = center_x + int(icon_size * 0.18)
    knife_y = center_y - int(knife_height * 0.35)
    
    # Knife blade
    blade_points = [
        (knife_x - knife_width//2, knife_y + int(knife_height * 0.08)),  # Top left
        (knife_x + knife_width//2, knife_y),  # Top right (pointed)
        (knife_x + knife_width//2, knife_y + int(knife_height * 0.55)),  # Bottom right
        (knife_x - knife_width//2, knife_y + int(knife_height * 0.55)),  # Bottom left
    ]
    draw.polygon(blade_points, fill=accent_color)
    
    # Knife handle
    handle_y = knife_y + int(knife_height * 0.52)
    handle_width = int(knife_width * 1.1)
    draw.rounded_rectangle(
        [knife_x - handle_width//2, handle_y,
         knife_x + handle_width//2, knife_y + knife_height],
        radius=handle_width//3,
        fill=accent_color
    )
    
    # Add small camera/flash element (top right corner) - represents "snap"
    flash_size = int(size * 0.12)
    flash_x = center_x + int(icon_size * 0.28)
    flash_y = center_y - int(icon_size * 0.28)
    
    # Camera viewfinder/flash icon
    draw.ellipse(
        [flash_x - flash_size//2, flash_y - flash_size//2,
         flash_x + flash_size//2, flash_y + flash_size//2],
        fill=accent_color
    )
    
    # Inner circle (lens effect)
    inner_size = int(flash_size * 0.5)
    draw.ellipse(
        [flash_x - inner_size//2, flash_y - inner_size//2,
         flash_x + inner_size//2, flash_y + inner_size//2],
        fill=primary_color
    )
    
    # Small highlight dot
    dot_size = int(flash_size * 0.2)
    dot_offset = int(flash_size * 0.12)
    draw.ellipse(
        [flash_x - dot_offset - dot_size//2, flash_y - dot_offset - dot_size//2,
         flash_x - dot_offset + dot_size//2, flash_y - dot_offset + dot_size//2],
        fill=accent_color
    )
    
    return img


def create_adaptive_icon(size=512):
    """Create Android adaptive icon (foreground layer)"""
    
    # Adaptive icons need extra padding (safe zone is 66% of the icon)
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Calculate safe zone (center 66%)
    safe_margin = int(size * 0.17)
    safe_size = size - (safe_margin * 2)
    
    center_x = size // 2
    center_y = size // 2
    
    # Colors
    accent_color = (255, 255, 255)
    primary_color = (255, 107, 107)
    
    icon_scale = 0.50
    icon_size = int(safe_size * icon_scale)
    
    # Draw fork (left side)
    fork_width = int(icon_size * 0.09)
    fork_height = int(icon_size * 0.70)
    fork_x = center_x - int(icon_size * 0.20)
    fork_y = center_y - int(fork_height * 0.40)
    
    # Fork handle
    handle_height = int(fork_height * 0.45)
    draw.rounded_rectangle(
        [fork_x - fork_width//2, fork_y + fork_height - handle_height,
         fork_x + fork_width//2, fork_y + fork_height],
        radius=fork_width//3,
        fill=accent_color
    )
    
    # Fork prongs
    prong_gap = int(fork_width * 1.1)
    prong_height = int(fork_height * 0.45)
    prong_width = int(fork_width * 0.65)
    
    for i in range(-1, 2):
        prong_x = fork_x + i * prong_gap
        draw.rounded_rectangle(
            [prong_x - prong_width//2, fork_y,
             prong_x + prong_width//2, fork_y + prong_height],
            radius=prong_width//2,
            fill=accent_color
        )
    
    # Fork connector
    connector_y = fork_y + prong_height - int(fork_width * 0.5)
    draw.rounded_rectangle(
        [fork_x - prong_gap - prong_width//2, connector_y,
         fork_x + prong_gap + prong_width//2, connector_y + int(fork_width * 1.4)],
        radius=fork_width//3,
        fill=accent_color
    )
    
    # Draw knife (right side)
    knife_width = int(icon_size * 0.13)
    knife_height = int(icon_size * 0.70)
    knife_x = center_x + int(icon_size * 0.16)
    knife_y = center_y - int(knife_height * 0.40)
    
    # Knife blade
    blade_points = [
        (knife_x - knife_width//2, knife_y + int(knife_height * 0.08)),
        (knife_x + knife_width//2, knife_y),
        (knife_x + knife_width//2, knife_y + int(knife_height * 0.55)),
        (knife_x - knife_width//2, knife_y + int(knife_height * 0.55)),
    ]
    draw.polygon(blade_points, fill=accent_color)
    
    # Knife handle
    handle_y = knife_y + int(knife_height * 0.52)
    handle_width = int(knife_width * 1.1)
    draw.rounded_rectangle(
        [knife_x - handle_width//2, handle_y,
         knife_x + handle_width//2, knife_y + knife_height],
        radius=handle_width//3,
        fill=accent_color
    )
    
    # Camera element
    flash_size = int(safe_size * 0.11)
    flash_x = center_x + int(icon_size * 0.26)
    flash_y = center_y - int(icon_size * 0.26)
    
    draw.ellipse(
        [flash_x - flash_size//2, flash_y - flash_size//2,
         flash_x + flash_size//2, flash_y + flash_size//2],
        fill=accent_color
    )
    
    inner_size = int(flash_size * 0.5)
    draw.ellipse(
        [flash_x - inner_size//2, flash_y - inner_size//2,
         flash_x + inner_size//2, flash_y + inner_size//2],
        fill=primary_color
    )
    
    return img


if __name__ == "__main__":
    # Create main icon for Google Play Store (512x512)
    print("Creating Snapfood app icon...")
    
    icon = create_snapfood_icon(512)
    icon.save('/app/snapfood_icon_512.png', 'PNG')
    print("✓ Saved: /app/snapfood_icon_512.png (512x512)")
    
    # Create high-res version (1024x1024)
    icon_hd = create_snapfood_icon(1024)
    icon_hd.save('/app/snapfood_icon_1024.png', 'PNG')
    print("✓ Saved: /app/snapfood_icon_1024.png (1024x1024)")
    
    # Create adaptive icon foreground for Android
    adaptive = create_adaptive_icon(512)
    adaptive.save('/app/snapfood_adaptive_foreground.png', 'PNG')
    print("✓ Saved: /app/snapfood_adaptive_foreground.png (for Android adaptive icon)")
    
    # Create adaptive icon background (solid coral)
    bg = Image.new('RGBA', (512, 512), (255, 107, 107, 255))
    bg.save('/app/snapfood_adaptive_background.png', 'PNG')
    print("✓ Saved: /app/snapfood_adaptive_background.png")
    
    print("\n🎉 All icons created successfully!")
    print("\nFor Google Play Console, use: snapfood_icon_512.png")
    print("For app.json icon field, use: snapfood_icon_1024.png")
