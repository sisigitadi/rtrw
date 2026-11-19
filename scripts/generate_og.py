import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_rounded_mask(size, radius):
    mask = Image.new('L', size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), size], radius=radius, fill=255)
    return mask

def generate():
    width = 1200
    height = 630
    
    # 1. Base image with deep slate-teal background
    bg_color = (15, 23, 26) # #0F171A
    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)
    
    # 2. Draw subtle blueprint grid lines matching the logo style
    grid_color = (25, 38, 42) # subtle grid lines
    grid_spacing = 40
    for x in range(0, width, grid_spacing):
        draw.line([(x, 0), (x, height)], fill=grid_color, width=1)
    for y in range(0, height, grid_spacing):
        draw.line([(0, y), (width, y)], fill=grid_color, width=1)
        
    # Major grid lines every 200px
    major_grid = (33, 50, 54)
    for x in range(0, width, 200):
        draw.line([(x, 0), (x, height)], fill=major_grid, width=1)
    for y in range(0, height, 200):
        draw.line([(0, y), (width, y)], fill=major_grid, width=1)

    # Subtle vignette / glow on left behind logo and top right
    # Outer border
    draw.rectangle([(0, 0), (width - 1, height - 1)], outline=(35, 55, 52), width=2)
    draw.rectangle([(8, 8), (width - 9, height - 9)], outline=(20, 32, 34), width=1)

    # 3. Load & Process Logo
    logo_src_path = r"C:/Users/sisig/.gemini/antigravity/brain/2a620824-bf63-4ed5-948c-fb19e820567b/.user_uploaded/media_1795049762055_5fcc2d4b.jpg"
    logo_orig = Image.open(logo_src_path).convert('RGBA')
    
    logo_size = 400
    logo_resized = logo_orig.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    
    # Rounded corners for logo
    mask = create_rounded_mask((logo_size, logo_size), 28)
    
    # Logo container frame
    logo_x = 70
    logo_y = 115
    
    # Shadow under logo
    shadow = Image.new('RGBA', (logo_size + 24, logo_size + 24), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle([(12, 12), (logo_size + 12, logo_size + 12)], radius=28, fill=(0, 0, 0, 160))
    shadow = shadow.filter(ImageFilter.GaussianBlur(16))
    img.paste(shadow, (logo_x - 12, logo_y - 8), shadow)
    
    # Paste logo
    img.paste(logo_resized, (logo_x, logo_y), mask)
    
    # Border on logo
    draw.rounded_rectangle(
        [(logo_x, logo_y), (logo_x + logo_size, logo_y + logo_size)],
        radius=28,
        outline=(52, 85, 78),
        width=2
    )

    # 4. Fonts
    font_bold_path = os.path.join("assets", "fonts", "PlusJakartaSans-Bold.ttf")
    font_semi_path = os.path.join("assets", "fonts", "PlusJakartaSans-SemiBold.ttf")
    font_reg_path = os.path.join("assets", "fonts", "PlusJakartaSans-Regular.ttf")
    
    font_badge = ImageFont.truetype(font_bold_path, 13)
    font_title = ImageFont.truetype(font_bold_path, 54)
    font_sub = ImageFont.truetype(font_semi_path, 23)
    font_desc = ImageFont.truetype(font_reg_path, 18)
    font_tag = ImageFont.truetype(font_semi_path, 13)
    font_footer = ImageFont.truetype(font_semi_path, 15)

    # 5. Right Side Content
    text_x = 515
    
    # Pill Badge: "SISTEM ADMINISTRASI DIGITAL RT / RW"
    badge_text = "SISTEM ADMINISTRASI DIGITAL RT / RW"
    bbox_b = font_badge.getbbox(badge_text)
    badge_w = (bbox_b[2] - bbox_b[0]) + 28
    badge_h = 32
    badge_y = 115
    
    draw.rounded_rectangle(
        [(text_x, badge_y), (text_x + badge_w, badge_y + badge_h)],
        radius=16,
        fill=(19, 46, 41), # #132E29
        outline=(35, 90, 80),
        width=1
    )
    draw.text((text_x + 14, badge_y + 8), badge_text, font=font_badge, fill=(45, 212, 191)) # #2DD4BF

    # Title: "SiWarga RT/RW"
    draw.text((text_x, 168), "SiWarga RT/RW", font=font_title, fill=(255, 255, 255))

    # Subtitle: "Portal Administrasi Rukun Tetangga & Rukun Warga"
    draw.text((text_x, 240), "Portal Administrasi Rukun Tetangga & Rukun Warga", font=font_sub, fill=(94, 234, 212)) # #5EEAD4

    # Descriptions with subtle check / bullet icon
    bullets = [
        "Pengurusan Surat Berjenjang & Verifikasi QR Code Resmi",
        "Transparansi Buku Kas RT & Setoran Kas Wajib RW",
        "Verifikasi Pembayaran Iuran & Pendataan Penduduk Terpadu"
    ]
    bullet_y = 292
    for b in bullets:
        # Small accent indicator dot
        draw.ellipse([(text_x, bullet_y + 6), (text_x + 7, bullet_y + 13)], fill=(45, 212, 191))
        draw.text((text_x + 18, bullet_y), b, font=font_desc, fill=(203, 213, 225)) # #CBD5E1
        bullet_y += 34

    # Tags / Highlights
    tags = ["Surat & QR Code", "Transparansi Kas", "Iuran Warga", "Laporan & Pengumuman"]
    tag_x = text_x
    tag_y = 422
    for t in tags:
        bbox_t = font_tag.getbbox(t)
        t_w = (bbox_t[2] - bbox_t[0]) + 20
        draw.rounded_rectangle(
            [(tag_x, tag_y), (tag_x + t_w, tag_y + 30)],
            radius=6,
            fill=(24, 36, 40),
            outline=(45, 68, 64),
            width=1
        )
        draw.text((tag_x + 10, tag_y + 7), t, font=font_tag, fill=(148, 163, 184))
        tag_x += t_w + 12

    # Divider line
    draw.line([(text_x, 480), (width - 70, 480)], fill=(32, 48, 52), width=1)

    # Footer domain & status
    draw.text((text_x, 500), "https://sisigitadi.github.io/rtrw/", font=font_footer, fill=(100, 116, 139))
    
    live_badge_text = "Live Demo Online"
    bbox_live = font_footer.getbbox(live_badge_text)
    live_x = width - 70 - (bbox_live[2] - bbox_live[0]) - 24
    draw.rounded_rectangle(
        [(live_x, 495), (width - 70, 525)],
        radius=15,
        fill=(14, 43, 37),
        outline=(22, 101, 88),
        width=1
    )
    # Green live dot
    draw.ellipse([(live_x + 10, 507), (live_x + 16, 513)], fill=(34, 197, 94))
    draw.text((live_x + 22, 502), live_badge_text, font=font_footer, fill=(167, 243, 208))

    # Save outputs
    os.makedirs('dist', exist_ok=True)
    os.makedirs('assets', exist_ok=True)
    
    img.save('og-image.png', 'PNG', optimize=True)
    img.save('dist/og-image.png', 'PNG', optimize=True)
    img.save('assets/og-image.png', 'PNG', optimize=True)
    print("OG image created at og-image.png and dist/og-image.png")
    
    # Also create favicon.png (64x64 and 32x32)
    fav64 = logo_orig.resize((64, 64), Image.Resampling.LANCZOS)
    fav64.save('favicon.png', 'PNG')
    fav64.save('dist/favicon.png', 'PNG')
    fav64.save('assets/favicon.png', 'PNG')
    print("Favicon created at favicon.png and dist/favicon.png")

if __name__ == '__main__':
    generate()
