BEGIN;

ALTER TABLE public.products
  ALTER COLUMN blood_type DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

-- Sourcing requests do not reserve or restore inventory.
DROP TRIGGER IF EXISTS trg_order_inventory ON public.orders;

-- A NULL blood type identifies a listing. Typed rows still support historical
-- order references. Keep the alias IDs used by the existing catalog together.
CREATE OR REPLACE FUNCTION public.sourcing_product_key(type_id text)
RETURNS text
LANGUAGE sql
IMMUTABLE STRICT
SET search_path = ''
AS $$
  SELECT CASE type_id
    WHEN 'pt-stack-blood' THEN 'pt-packed-rbc'
    WHEN 'pt-radiant' THEN 'pt-irradiated'
    WHEN 'pt-leukoreduced' THEN 'pt-filtered'
    WHEN 'pt-1789956798153' THEN 'pt-plasma'
    WHEN 'pt-1790133935375' THEN 'pt-platelets'
    WHEN 'pt-1790134002398' THEN 'pt-phlebotomy'
    ELSE type_id
  END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS products_one_sourcing_listing_per_type
  ON public.products (public.sourcing_product_key(product_type_id))
  WHERE blood_type IS NULL;

WITH candidates AS (
  SELECT p.*, public.sourcing_product_key(p.product_type_id) AS listing_key
  FROM public.products AS p
  WHERE p.blood_type IS NOT NULL
), representatives AS (
  SELECT DISTINCT ON (listing_key) *
  FROM candidates
  ORDER BY listing_key, (price > 0) DESC, updated_at DESC NULLS LAST,
    created_at DESC NULLS LAST, id
)
INSERT INTO public.products (id, name, description, product_type_id, price, image_url, active)
SELECT
  'service-' || p.listing_key,
  CASE p.listing_key
    WHEN 'pt-packed-rbc' THEN 'Packed Red Blood'
    WHEN 'pt-irradiated' THEN 'Irradiated Blood'
    WHEN 'pt-filtered' THEN 'Filtered Blood'
    WHEN 'pt-plasma' THEN 'Fresh Frozen Plasma'
    WHEN 'pt-platelets' THEN 'Blood Platelets'
    WHEN 'pt-phlebotomy' THEN 'Therapeutic Phlebotomy'
    ELSE COALESCE(canonical.name, original.name)
  END,
  COALESCE(canonical.description, original.description, ''),
  COALESCE(canonical.id, original.id),
  p.price,
  p.image_url,
  p.active AND p.listing_key <> 'pt-phlebotomy'
FROM representatives AS p
JOIN public.product_types AS original ON original.id = p.product_type_id
LEFT JOIN public.product_types AS canonical ON canonical.id = p.listing_key
ON CONFLICT DO NOTHING;

COMMIT;
