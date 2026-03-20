import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import '../styles/_coleccionespage.scss';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import AtelierConversionSection from '../components/common/AtelierConversionSection';
import PageMeta from '../components/common/PageMeta';
import {
  buildProductQuoteMessage,
  collectionOrder,
  filterCollectionItems,
  getCollectionCatalog,
  getCollectionFilterOptions,
  getCollectionInsights,
  getCrossCollectionSuggestions,
  getRelatedItems,
} from '../lib/catalog';

const WHATSAPP_LINK = 'https://wa.me/qr/JXM3LVGEI75HC1';

const atelierPromises = [
  {
    title: 'Hecho a Mano',
    text: 'Cada propuesta se trabaja con atencion al detalle y criterio artesanal.',
  },
  {
    title: 'Cotizacion a Medida',
    text: 'Adaptamos materiales, acabados y variaciones segun la idea del cliente.',
  },
  {
    title: 'Acompanamiento Personal',
    text: 'Te guiamos en materiales, estilo y tiempos para elegir con confianza.',
  },
];

const createFilterState = () => ({
  metal: 'Todos',
  type: 'Todos',
  occasion: 'Todos',
  style: 'Todos',
  protagonism: 'Todos',
});

const filterLabels = [
  { key: 'metal', label: 'Metal' },
  { key: 'type', label: 'Tipo' },
  { key: 'occasion', label: 'Ocasion' },
  { key: 'style', label: 'Estilo' },
  { key: 'protagonism', label: 'Protagonismo' },
];

const CollectionsHero = ({ title, subtitle, backgroundImage }) => (
  <section className="collections-hero" style={{ backgroundImage: `url(${backgroundImage})` }}>
    <div className="collections-hero-content">
      <h1 className="collections-hero-title">{title}</h1>
      <p className="collections-hero-subtitle">{subtitle}</p>
    </div>
  </section>
);

const CollectionsDescription = ({ text }) => (
  <section className="collections-description">
    <p>{text}</p>
  </section>
);

const CollectionTrustBar = () => (
  <section className="collection-trust-bar">
    {atelierPromises.map((promise) => (
      <div key={promise.title} className="collection-trust-card">
        <h3>{promise.title}</h3>
        <p>{promise.text}</p>
      </div>
    ))}
  </section>
);

const CollectionOverviewCard = ({ collection, insights }) => (
  <Link to={`/colecciones/${collection.slug}`} className="collection-category-card collection-category-card-rich">
    <img
      src={collection.cardImage || collection.backgroundImage}
      alt={collection.title}
      className="collection-category-image"
      loading="lazy"
      decoding="async"
    />
    <div className="collection-category-overlay">
      <div className="collection-category-topline">
        <span>{insights.itemCount} piezas</span>
        <strong>{insights.topStyles.join(' / ')}</strong>
      </div>
      <h3>{collection.title}</h3>
      <p>{collection.subtitle}</p>
      <div className="collection-category-pills">
        {insights.topOccasions.map((occasion) => (
          <span key={occasion}>{occasion}</span>
        ))}
      </div>
    </div>
  </Link>
);

const CollectionsOverview = () => (
  <div className="colecciones-page fade-in-section">
    <PageMeta
      title="Colecciones | Anillos, aretes, cadenas y pulseras de El Atelier Artesanal"
      description="Explora las colecciones activas de El Atelier Artesanal y descubre joyas por ocasion, estilo y protagonismo."
      path="/colecciones"
      image="/hero-background1.jpg"
    />
    <CollectionsHero
      title="Colecciones"
      subtitle="Explora todas las familias disponibles del atelier y entra a la que quieras descubrir primero."
      backgroundImage="/hero-background1.jpg"
    />

    <CollectionsDescription text="Aqui reunimos las colecciones base activas del sitio. Ya estan visibles Anillos, Aretes, Cadenas y Pulseras para que el recorrido sea claro desde el encabezado." />

    <div className="collections-main-content">
      <div className="collections-overview-note">
        <span>Lectura del catalogo</span>
        <p>
          Cada familia ya tiene estructura para descubrir tipo de pieza, ocasion y nivel de protagonismo antes de abrir
          la ficha completa.
        </p>
      </div>

      <div className="collections-overview-grid">
        {collectionOrder.map((slug) => {
          const collection = getCollectionCatalog(slug);
          const insights = getCollectionInsights(collection);

          return <CollectionOverviewCard key={slug} collection={collection} insights={insights} />;
        })}
      </div>
    </div>

    <AtelierConversionSection
      className="collections-conversion-section"
      kicker="Compra con criterio"
      title="Si ya viste una familia que te gusta, el siguiente paso puede ser mucho mas claro"
      copy="Puedes seguir explorando el catalogo, pasar al configurador para aterrizar una idea propia o solicitar una cita corta si necesitas una recomendacion mas personal."
      highlights={['Catalogo mas guiado', 'Cotizacion con referencia', 'Asesoria directa del atelier']}
      primaryAction={{ label: 'Ir al configurador', to: '/configurador' }}
      secondaryAction={{ label: 'Hablar por WhatsApp', href: WHATSAPP_LINK, external: true }}
      formTitle="Agenda una asesoria breve"
      formCopy="Ideal si tienes una ocasion importante, un presupuesto sensible o todavia no sabes que coleccion te conviene mas."
      defaultReason="Asesoria para elegir una coleccion o una pieza"
      source="collections-overview"
    />
  </div>
);

const CollectionInsightsBar = ({ filteredCount, favoriteCount, insights }) => (
  <section className="collections-insights-bar">
    <div className="collections-insight-card">
      <span>Piezas visibles</span>
      <strong>{filteredCount}</strong>
      <p>Referencias activas con los filtros actuales.</p>
    </div>
    <div className="collections-insight-card">
      <span>Favoritos guardados</span>
      <strong>{favoriteCount}</strong>
      <p>Piezas tuyas guardadas del atelier para volver luego.</p>
    </div>
    <div className="collections-insight-card">
      <span>Ocasiones fuertes</span>
      <strong>{insights.topOccasions.join(' / ')}</strong>
      <p>{insights.editorialLine}</p>
    </div>
  </section>
);

const FavoriteShelf = ({ items, onOpen }) => {
  if (!items.length) {
    return null;
  }

  return (
    <section className="collections-favorites-shelf">
      <div className="collections-favorites-head">
        <div>
          <span>Tus favoritas</span>
          <h2>Piezas que ya te interesaron y merecen una segunda mirada</h2>
        </div>
        <Link to="/cuenta" className="product-action-link">
          Ver mi cuenta
        </Link>
      </div>

      <div className="collections-favorites-grid">
        {items.map((item) => (
          <button key={item.reference} type="button" className="collections-favorite-card" onClick={() => onOpen(item)}>
            <img src={item.image} alt={item.name} loading="lazy" decoding="async" />
            <div>
              <span>{item.reference}</span>
              <strong>{item.name}</strong>
              <p>{item.category}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

const CrossCollectionSuggestions = ({ currentSlug }) => {
  const suggestions = getCrossCollectionSuggestions(currentSlug);

  if (!suggestions.length) {
    return null;
  }

  return (
    <section className="collections-discovery-section">
      <div className="collections-discovery-head">
        <div>
          <span>Descubrir despues</span>
          <h2>Si esta familia te gusta, estas otras pueden completar mejor la decision</h2>
        </div>
        <Link to="/configurador" className="collections-filter-reset">
          Ir al configurador
        </Link>
      </div>

      <div className="collections-discovery-grid">
        {suggestions.map((suggestion) => (
          <article key={suggestion.slug} className="collections-discovery-card">
            <img src={suggestion.image} alt={suggestion.title} loading="lazy" decoding="async" />
            <div className="collections-discovery-copy">
              <span>{suggestion.itemCount} piezas</span>
              <h3>{suggestion.title}</h3>
              <p>{suggestion.reason}</p>
              <div className="collection-category-pills">
                {suggestion.topOccasions.map((occasion) => (
                  <span key={occasion}>{occasion}</span>
                ))}
              </div>
              <div className="collections-discovery-card-actions">
                <Link to={`/colecciones/${suggestion.slug}`} className="product-action-link">
                  Explorar {suggestion.title}
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

const CollectionsFilters = ({ options, visibleSections, activeFilters, filteredCount, totalCount, onChange, onReset }) => (
  <section className="collections-filter-shell">
    <div className="collections-filter-head">
      <div>
        <span className="collections-filter-kicker">Filtros inteligentes</span>
        <h2>Explora por ocasion, estilo y protagonismo</h2>
        <p className="collections-filter-summary">
          Mostrando {filteredCount} de {totalCount} piezas visibles.
        </p>
      </div>
      <button type="button" className="collections-filter-reset" onClick={onReset}>
        Limpiar filtros
      </button>
    </div>

    <div className="collections-filter-groups">
      {visibleSections.map((section) => (
        <div key={section.key} className="collections-filter-group">
          <span>{section.label}</span>
          <div className="collections-filter-pills">
            {options[section.key].map((option) => (
              <button
                key={`${section.key}-${option}`}
                type="button"
                className={`filter-button ${activeFilters[section.key] === option ? 'active' : ''}`}
                onClick={() => onChange(section.key, option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  </section>
);

const CollectionCard = ({
  item,
  isFavorite,
  accountState,
  actionLoadingKey,
  onOpen,
  onFavorite,
  onAddToCart,
  isAuthenticated,
}) => (
  <article className="collection-card">
    <div className="collection-card-visual">
      {isAuthenticated ? (
        <button
          type="button"
          className={`collection-favorite-badge ${isFavorite ? 'is-success' : ''}`}
          onClick={() => onFavorite(item)}
          disabled={actionLoadingKey === `favorite-${item.reference}`}
        >
          {actionLoadingKey === `favorite-${item.reference}` ? 'Guardando...' : isFavorite ? 'Guardado' : 'Favorito'}
        </button>
      ) : (
        <Link to="/cuenta" className="collection-favorite-badge collection-favorite-link">
          Entrar para guardar
        </Link>
      )}
      <button type="button" className="collection-item-button" onClick={() => onOpen(item)}>
        <img src={item.image} alt={item.name} className="item-image" loading="lazy" decoding="async" />
      </button>
    </div>

    <div className="collection-card-copy">
      <div className="collection-card-topline">
        <span>{item.reference}</span>
        <strong>{item.protagonism}</strong>
      </div>

      <h3>{item.name}</h3>
      <p className="collection-card-summary">{item.summary}</p>

      <div className="collection-card-pills">
        <span>{item.type}</span>
        <span>{item.style}</span>
        <span>{item.occasions[0]}</span>
      </div>

      <div className="collection-card-meta">
        <div>
          <span>Ideal para</span>
          <strong>{item.idealForShort}</strong>
        </div>
        <div>
          <span>Combina con</span>
          <strong>{item.combinesWith}</strong>
        </div>
      </div>

      <div className="collection-card-actions">
        <button type="button" className="product-action-link" onClick={() => onOpen(item)}>
          Ver ficha completa
        </button>
        {isAuthenticated ? (
          <button
            type="button"
            className={`product-action-secondary ${accountState.cart === item.reference ? 'is-success' : ''}`}
            onClick={() => onAddToCart(item)}
            disabled={actionLoadingKey === `cart-${item.reference}`}
          >
            {actionLoadingKey === `cart-${item.reference}`
              ? 'Agregando...'
              : accountState.cart === item.reference
                ? 'Agregado'
                : 'Agregar a canasta'}
          </button>
        ) : (
          <Link to="/cuenta" className="product-action-secondary">
            Guarda en tu cuenta
          </Link>
        )}
      </div>
    </div>
  </article>
);

const ProductModal = ({
  collection,
  item,
  relatedItems,
  copyState,
  accountState,
  actionLoadingKey,
  isAuthenticated,
  favoriteReferences,
  onClose,
  onCopy,
  onFavorite,
  onAddToCart,
  onSelectRelated,
}) => {
  const [modalImageSrc, setModalImageSrc] = useState(item?.image || collection?.cardImage || collection?.backgroundImage || '');

  useEffect(() => {
    setModalImageSrc(item?.image || collection?.cardImage || collection?.backgroundImage || '');
  }, [collection?.backgroundImage, collection?.cardImage, item?.image, item?.reference]);

  if (!item) {
    return null;
  }

  return (
    <div className="product-modal-overlay" onClick={onClose}>
      <div className="product-modal" role="dialog" aria-modal="true" aria-label={`Detalle de ${item.name}`} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="product-modal-close" onClick={onClose} aria-label="Cerrar detalle">
          x
        </button>

        <div className="product-modal-grid">
          <div className="product-modal-visual">
            <img
              key={item.reference}
              src={modalImageSrc}
              alt={item.name}
              className="product-modal-image"
              decoding="async"
              loading="eager"
              onError={() => {
                if (modalImageSrc !== (collection.cardImage || collection.backgroundImage)) {
                  setModalImageSrc(collection.cardImage || collection.backgroundImage || '');
                }
              }}
            />
          </div>

          <div className="product-modal-copy">
            <div className="product-journey-strip">
              <span>1. Revisa la pieza</span>
              <span>2. Personaliza</span>
              <span>3. Agenda si quieres acompanamiento</span>
            </div>
            <span className="product-modal-eyebrow">{collection.title}</span>
            <h2>{item.name}</h2>
            <p className="product-modal-reference">Referencia {item.reference}</p>

            <div className="product-modal-tags">
              <span>{item.type}</span>
              <span>{item.metal}</span>
              <span>{item.style}</span>
              <span>{item.protagonism}</span>
            </div>

            <p className="product-modal-summary">{item.summary}</p>

            <div className="product-specs-grid">
              <div>
                <h4>Material sugerido</h4>
                <p>{item.material}</p>
              </div>
              <div>
                <h4>Acabado</h4>
                <p>{item.finish}</p>
              </div>
              <div>
                <h4>Ideal para</h4>
                <p>{item.idealFor}</p>
              </div>
              <div>
                <h4>Ocasiones</h4>
                <p>{item.occasions.join(', ')}</p>
              </div>
              <div>
                <h4>Estilo</h4>
                <p>{item.style} con nivel de protagonismo {item.protagonism.toLowerCase()}.</p>
              </div>
              <div>
                <h4>Combina con</h4>
                <p>{item.combinesWith}</p>
              </div>
            </div>

            <div className="product-trust-pills">
              <span>Hecho a mano</span>
              <span>Cotizacion personalizada</span>
              <span>Atencion directa</span>
              <span>Pieza relacionada al catalogo real</span>
            </div>

            <div className="product-modal-actions">
              <button type="button" className="product-action-secondary" onClick={() => onCopy(buildProductQuoteMessage(collection, item))}>
                {copyState === item.reference ? 'Mensaje copiado' : 'Copiar mensaje de cotizacion'}
              </button>

              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="product-action-primary"
              >
                Abrir WhatsApp
              </a>

              <Link
                to="/configurador"
                state={{
                  initialPrompt: item.prompt,
                  productName: item.name,
                  reference: item.reference,
                  focusConversion: false,
                }}
                className="product-action-link"
                onClick={onClose}
              >
                Personalizar en el configurador
              </Link>

              <Link
                to="/configurador"
                state={{
                  initialPrompt: item.prompt,
                  productName: item.name,
                  reference: item.reference,
                  focusConversion: true,
                }}
                className="product-action-link product-action-link-quiet"
                onClick={onClose}
              >
                Seguir a cita guiada
              </Link>

              {isAuthenticated ? (
                <>
                  <button
                    type="button"
                    className={`product-action-secondary ${favoriteReferences.has(item.reference) ? 'is-success' : ''}`}
                    onClick={() => onFavorite(item)}
                    disabled={actionLoadingKey === `favorite-${item.reference}`}
                  >
                    {actionLoadingKey === `favorite-${item.reference}`
                      ? 'Guardando...'
                      : favoriteReferences.has(item.reference)
                        ? 'Guardado en favoritos'
                        : 'Guardar en favoritos'}
                  </button>
                  <button
                    type="button"
                    className={`product-action-secondary ${accountState.cart === item.reference ? 'is-success' : ''}`}
                    onClick={() => onAddToCart(item)}
                    disabled={actionLoadingKey === `cart-${item.reference}`}
                  >
                    {actionLoadingKey === `cart-${item.reference}`
                      ? 'Agregando...'
                      : accountState.cart === item.reference
                        ? 'Agregado a la canasta'
                        : 'Agregar a canasta'}
                  </button>
                </>
              ) : (
                <Link to="/cuenta" className="product-action-secondary" onClick={onClose}>
                  Inicia sesion para guardar
                </Link>
              )}
            </div>

            <p className="product-modal-note">
              Abre WhatsApp y pega el mensaje copiado para que la consulta llegue con referencia y contexto.
            </p>
            {accountState.message ? <p className="product-modal-note product-modal-note-accent">{accountState.message}</p> : null}
            {accountState.error ? <p className="product-modal-note product-modal-note-error">{accountState.error}</p> : null}

            {relatedItems.length ? (
              <div className="product-related-section">
                <div className="product-related-head">
                  <h3>Piezas relacionadas</h3>
                  <p>Si esta referencia te gusta, estas otras mantienen un lenguaje cercano en tipo, estilo u ocasion.</p>
                </div>

                <div className="product-related-grid">
                  {relatedItems.map((related) => (
                    <button
                      key={related.reference}
                      type="button"
                      className="product-related-card"
                      onClick={() => onSelectRelated(related)}
                    >
                      <img src={related.image} alt={related.name} loading="lazy" decoding="async" />
                      <div>
                        <span>{related.type}</span>
                        <strong>{related.name}</strong>
                        <p>{related.occasions.join(', ')}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

const ColeccionesPage = () => {
  const { categoria } = useParams();
  const { token, isAuthenticated } = useAuth();
  const currentCollection = useMemo(() => (categoria ? getCollectionCatalog(categoria) : null), [categoria]);
  const filterOptions = useMemo(() => getCollectionFilterOptions(currentCollection), [currentCollection]);
  const collectionInsights = useMemo(() => getCollectionInsights(currentCollection), [currentCollection]);
  const visibleFilterSections = useMemo(
    () => filterLabels.filter((section) => (filterOptions[section.key] || []).length > 2),
    [filterOptions],
  );
  const [activeFilters, setActiveFilters] = useState(createFilterState());
  const [selectedItem, setSelectedItem] = useState(null);
  const [copiedReference, setCopiedReference] = useState('');
  const [favoriteReferences, setFavoriteReferences] = useState(new Set());
  const [favoriteItems, setFavoriteItems] = useState([]);
  const [actionLoadingKey, setActionLoadingKey] = useState('');
  const [accountState, setAccountState] = useState({
    favorite: '',
    cart: '',
    message: '',
    error: '',
  });

  useEffect(() => {
    setActiveFilters(createFilterState());
    setSelectedItem(null);
    setCopiedReference('');
    setActionLoadingKey('');
    setAccountState({
      favorite: '',
      cart: '',
      message: '',
      error: '',
    });
  }, [currentCollection]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setFavoriteReferences(new Set());
      setFavoriteItems([]);
      return;
    }

    let cancelled = false;

    apiFetch('/api/account/favorites', { token })
      .then((data) => {
        if (!cancelled) {
          setFavoriteItems(data.items);
          setFavoriteReferences(new Set(data.items.map((item) => item.reference)));
        }
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token]);

  const filteredItems = useMemo(() => {
    if (!currentCollection) {
      return [];
    }

    return filterCollectionItems(currentCollection.items, activeFilters);
  }, [activeFilters, currentCollection]);

  const relatedItems = useMemo(
    () => getRelatedItems(currentCollection, selectedItem),
    [currentCollection, selectedItem],
  );

  const visibleFavoriteItems = useMemo(() => {
    if (!favoriteItems.length) {
      return [];
    }

    const sameCollection = favoriteItems.filter((item) => item.slug === categoria);
    return (sameCollection.length ? sameCollection : favoriteItems).slice(0, 3);
  }, [categoria, favoriteItems]);

  const handleFilterChange = (key, value) => {
    setActiveFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setActiveFilters(createFilterState());
  };

  const handleCopyQuoteMessage = async (message) => {
    if (!selectedItem) {
      return;
    }

    try {
      await navigator.clipboard.writeText(message);
      setCopiedReference(selectedItem.reference);
    } catch (error) {
      console.error(error);
      setCopiedReference(selectedItem.reference);
    }
  };

  const saveAccountItem = async (path, payload, field, successMessage) => {
    if (!isAuthenticated || !token) {
      setAccountState((current) => ({
        ...current,
        error: 'Inicia sesion para guardar piezas en tu cuenta.',
        message: '',
      }));
      return;
    }

    try {
      setActionLoadingKey(`${field}-${payload.reference}`);
      await apiFetch(path, {
        method: 'POST',
        token,
        body: payload,
      });

      setAccountState((current) => ({
        ...current,
        [field]: payload.reference,
        message: successMessage,
        error: '',
      }));

      if (field === 'favorite') {
        setFavoriteReferences((current) => new Set([...current, payload.reference]));
        setFavoriteItems((current) =>
          current.some((item) => item.reference === payload.reference)
            ? current
            : [
                {
                  favoriteId: payload.reference,
                  category: payload.category,
                  name: payload.name,
                  image: payload.image,
                  reference: payload.reference,
                  slug: payload.slug,
                },
                ...current,
              ],
        );
      }
    } catch (error) {
      console.error(error);
      setAccountState((current) => ({
        ...current,
        message: '',
        error: error.message || 'No se pudo guardar la pieza.',
      }));
    } finally {
      setActionLoadingKey('');
    }
  };

  const handleFavorite = (item) =>
    saveAccountItem(
      '/api/account/favorites',
      {
        category: currentCollection.title,
        name: item.name,
        image: item.image,
        reference: item.reference,
        slug: categoria,
      },
      'favorite',
      'Pieza guardada en favoritos.',
    );

  const handleAddToCart = (item) =>
    saveAccountItem(
      '/api/account/cart',
      {
        category: currentCollection.title,
        name: item.name,
        image: item.image,
        reference: item.reference,
        slug: categoria,
        notes: `Interes inicial en ${item.name} de ${currentCollection.title}.`,
      },
      'cart',
      'Pieza agregada a tu canasta de cotizacion.',
    );

  if (!currentCollection) {
    return <CollectionsOverview />;
  }

  return (
    <div className="colecciones-page fade-in-section">
      <PageMeta
        title={`${currentCollection.title} | Coleccion de El Atelier Artesanal`}
        description={`${currentCollection.subtitle} Explora ${currentCollection.title.toLowerCase()} por ocasion, estilo y protagonismo dentro del atelier.`}
        path={`/colecciones/${categoria}`}
        image={currentCollection.backgroundImage || currentCollection.cardImage || '/hero-background1.jpg'}
      />
      <CollectionsHero
        title={currentCollection.title}
        subtitle={currentCollection.subtitle}
        backgroundImage={currentCollection.backgroundImage}
      />
      <CollectionsDescription text={currentCollection.description} />
      <CollectionTrustBar />

      <div className="collections-main-content">
        <CollectionsFilters
          options={filterOptions}
          visibleSections={visibleFilterSections}
          activeFilters={activeFilters}
          filteredCount={filteredItems.length}
          totalCount={currentCollection.items.length}
          onChange={handleFilterChange}
          onReset={resetFilters}
        />

        <CollectionInsightsBar
          filteredCount={filteredItems.length}
          favoriteCount={favoriteReferences.size}
          insights={collectionInsights}
        />

        <FavoriteShelf items={visibleFavoriteItems} onOpen={setSelectedItem} />

        {accountState.message ? <p className="collections-feedback collections-feedback-success">{accountState.message}</p> : null}
        {accountState.error ? <p className="collections-feedback collections-feedback-error">{accountState.error}</p> : null}

        {filteredItems.length ? (
          <div className="collections-grid">
            {filteredItems.map((item) => (
              <CollectionCard
                key={item.reference}
                item={item}
                isFavorite={favoriteReferences.has(item.reference)}
                accountState={accountState}
                actionLoadingKey={actionLoadingKey}
                isAuthenticated={isAuthenticated}
                onOpen={setSelectedItem}
                onFavorite={handleFavorite}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        ) : (
          <div className="collections-empty-state">
            <h3>No encontramos piezas con esta combinacion.</h3>
            <p>Prueba limpiar filtros o cambia ocasion, estilo o protagonismo para descubrir otras referencias del atelier.</p>
            <button type="button" className="collections-filter-reset" onClick={resetFilters}>
              Volver a ver todo
            </button>
          </div>
        )}

        <CrossCollectionSuggestions currentSlug={categoria} />
      </div>

      <AtelierConversionSection
        className="collections-conversion-section"
        kicker={`${currentCollection.title} con acompanamiento`}
        title={`Convierte ${currentCollection.title.toLowerCase()} en una decision mas segura`}
        copy={`Si ya encontraste una referencia dentro de ${currentCollection.title.toLowerCase()}, podemos ayudarte a aterrizar materiales, proporciones, presupuesto y siguiente paso sin salirte del recorrido.`}
        highlights={['Piezas hechas a mano', 'Variaciones por material y acabado', 'Ruta clara a cita o cotizacion']}
        primaryAction={{ label: 'Seguir en el configurador', to: '/configurador' }}
        secondaryAction={{ label: 'Abrir WhatsApp', href: WHATSAPP_LINK, external: true }}
        tertiaryAction={{ label: 'Entrar a mi cuenta', to: '/cuenta' }}
        formTitle="Solicita una cita sobre esta coleccion"
        formCopy="Si necesitas revisar simbolismo, tiempos o presupuesto, deja tu solicitud y retomamos contigo con una propuesta mas guiada."
        defaultReason={`Asesoria sobre la coleccion ${currentCollection.title}`}
        source={`collection-${categoria}`}
      />

      {selectedItem ? (
        <ProductModal
          collection={currentCollection}
          item={selectedItem}
          relatedItems={relatedItems}
          copyState={copiedReference}
          accountState={accountState}
          actionLoadingKey={actionLoadingKey}
          isAuthenticated={isAuthenticated}
          favoriteReferences={favoriteReferences}
          onClose={() => setSelectedItem(null)}
          onCopy={handleCopyQuoteMessage}
          onFavorite={handleFavorite}
          onAddToCart={handleAddToCart}
          onSelectRelated={setSelectedItem}
        />
      ) : null}
    </div>
  );
};

export default ColeccionesPage;
