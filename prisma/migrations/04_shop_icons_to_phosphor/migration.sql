-- Shop icons are Phosphor icon names (see src/lib/shopIcons.ts), not emoji.
-- Map the emoji the first version of the shop form offered to the matching icon;
-- anything else that isn't a known icon name falls back to NULL (rendered as "storefront").
UPDATE "Shop" SET "icon" = CASE
  WHEN "icon" IN ('📸', '📷') THEN 'camera'
  WHEN "icon" IN ('🖼️', '🖼') THEN 'frame-corners'
  WHEN "icon" = '🎁' THEN 'gift'
  WHEN "icon" IN ('🖨️', '🖨') THEN 'printer'
  WHEN "icon" IN ('🎞️', '🎞') THEN 'film-strip'
  WHEN "icon" = '💍' THEN 'diamond'
  WHEN "icon" = '⭐' THEN 'star'
  WHEN "icon" = '🏪' THEN 'storefront'
  ELSE NULL
END
WHERE "icon" IS NOT NULL
  AND "icon" NOT IN (
    'storefront', 'camera', 'aperture', 'image', 'frame-corners', 'gift', 'printer', 'film-strip',
    'video-camera', 'diamond', 'heart', 'star', 'buildings', 'house', 'package', 'briefcase'
  );
