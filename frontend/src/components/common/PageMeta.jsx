import { useEffect } from 'react';

const DEFAULT_TITLE = 'El Atelier Artesanal | Alta joyeria artesanal y diseno personalizado';
const DEFAULT_DESCRIPTION =
  'Explora colecciones de joyeria artesanal, disena una pieza personalizada y agenda asesoria con El Atelier Artesanal.';
const DEFAULT_IMAGE = '/hero-background.png';
const SITE_NAME = 'El Atelier Artesanal';

function upsertMetaByName(name, content) {
  if (typeof document === 'undefined' || !name) {
    return;
  }

  let element = document.head.querySelector(`meta[name="${name}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('name', name);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function upsertMetaByProperty(property, content) {
  if (typeof document === 'undefined' || !property) {
    return;
  }

  let element = document.head.querySelector(`meta[property="${property}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('property', property);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function upsertLink(rel, href) {
  if (typeof document === 'undefined' || !rel) {
    return;
  }

  let element = document.head.querySelector(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

function toAbsoluteUrl(value) {
  if (!value) {
    return '';
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (typeof window === 'undefined') {
    return value;
  }

  return new URL(value, window.location.origin).toString();
}

export default function PageMeta({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image = DEFAULT_IMAGE,
  type = 'website',
}) {
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    const canonicalUrl = toAbsoluteUrl(path || window.location.pathname);
    const imageUrl = toAbsoluteUrl(image || DEFAULT_IMAGE);
    const safeTitle = title || DEFAULT_TITLE;
    const safeDescription = description || DEFAULT_DESCRIPTION;

    document.title = safeTitle;
    upsertMetaByName('description', safeDescription);
    upsertMetaByName('twitter:card', 'summary_large_image');
    upsertMetaByName('twitter:title', safeTitle);
    upsertMetaByName('twitter:description', safeDescription);
    upsertMetaByName('twitter:image', imageUrl);
    upsertMetaByProperty('og:site_name', SITE_NAME);
    upsertMetaByProperty('og:locale', 'es_CO');
    upsertMetaByProperty('og:title', safeTitle);
    upsertMetaByProperty('og:description', safeDescription);
    upsertMetaByProperty('og:url', canonicalUrl);
    upsertMetaByProperty('og:image', imageUrl);
    upsertMetaByProperty('og:type', type);
    upsertLink('canonical', canonicalUrl);
  }, [description, image, path, title, type]);

  return null;
}
