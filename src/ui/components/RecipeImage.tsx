import type { CatalogRecipe, PhotoCredit } from '../../types.ts';
import { t } from '../../i18n/index.ts';
import { tx } from '../../i18n/nodes.tsx';
import { markPhotoFailed, photoKey, photoSources, usePhotoFailed } from '../photo.ts';
import { Plate } from './Plate.tsx';

/** Where a recipe image is drawn; each has its own frame in styles/photos.css. */
export type RecipeImageKind = 'meal' | 'card' | 'option' | 'sheet' | 'hero' | 'credit';

interface Props {
  recipe: Pick<CatalogRecipe, 'id' | 'cuisine' | 'photo'>;
  kind: RecipeImageKind;
  /** The img `sizes`: how wide the frame is drawn at each viewport, so the browser picks the thumbnail or the large file. */
  sizes: string;
  /** The plate's pixel size when there is no photo (CSS may scale it to the frame). */
  plateSize: number;
  /**
   * The recipe page's hero: loaded right away with high priority, and described by the photo's alt text. Everywhere
   * else the image is decorative (alt=""), since the recipe's name sits right beside it, and loads lazily.
   */
  hero?: boolean;
  className?: string;
}

/**
 * A recipe's photo, or its generative plate when it has none or the photo can't load (offline and not cached yet).
 * The img carries its intrinsic size, so the frame never shifts while it loads.
 */
export function RecipeImage({ recipe, kind, sizes, plateSize, hero = false, className }: Props) {
  const photo = recipe.photo;
  const key = photo ? photoKey(photo, sizes) : null;
  const failed = usePhotoFailed(key);
  const cls = `ri ri-${kind}${className ? ` ${className}` : ''}`;
  if (!photo || !key || failed) {
    return (
      <span className={`${cls} ri-fallback`}>
        <Plate id={recipe.id} cuisine={recipe.cuisine} size={plateSize} className="ri-plate" />
      </span>
    );
  }
  const s = photoSources(photo);
  return (
    <span className={`${cls} ri-has-photo`}>
      <img
        className="ri-img"
        src={s.src}
        srcSet={s.srcSet}
        sizes={sizes}
        width={s.width}
        height={s.height}
        alt={hero ? photo.alt : ''}
        style={{ objectPosition: s.objectPosition }}
        loading={hero ? 'eager' : 'lazy'}
        decoding={hero ? undefined : 'async'}
        fetchPriority={hero ? 'high' : undefined}
        onError={() => markPhotoFailed(key)}
      />
    </span>
  );
}

const SAFE_URL = /^https?:\/\//i;

/** A link out of the app: a new tab, no opener, no referrer, and says so to screen readers. */
function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="visually-hidden">{t('photo.newTab')}</span>
    </a>
  );
}

/** "Photo: <title> by <author> · <licence> · <source>. Resized and converted to WebP." with links where known. */
export function PhotoCreditText({ credit }: { credit: PhotoCredit }) {
  const link = (url: string | undefined, text: string) => (url && SAFE_URL.test(url) ? <ExternalLink href={url}>{text}</ExternalLink> : text);
  return (
    <>
      <span className="credit-line">
        {tx('photo.credit', {
          title: credit.title,
          author: link(credit.authorUrl, credit.author),
          license: link(credit.licenseUrl, credit.license),
          source: link(credit.sourceUrl, credit.source),
        })}
      </span>{' '}
      <span className="credit-changes">{t('photo.changes', { changes: credit.changes })}</span>
    </>
  );
}

/** Sizes of the recipe hero photo: the page width on phones, a column beside the title on wider screens. */
export const HERO_SIZES = '(min-width: 900px) 30vw, (min-width: 600px) 36rem, calc(100vw - 2rem)';

/** Whether the recipe page shows a photo (the credit goes with it) or the plate. */
export function useHeroPhoto(recipe: Pick<CatalogRecipe, 'photo'>): boolean {
  const photo = recipe.photo;
  return !usePhotoFailed(photo ? photoKey(photo, HERO_SIZES) : null) && !!photo;
}
