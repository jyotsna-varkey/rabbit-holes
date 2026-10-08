import { forwardRef } from 'react';
import { endpointInfo, type Endpoint } from '../content';

type Props = { endpoint: Endpoint; className?: string; credit?: boolean };

/** An endpoint, styled as a small Wikipedia infobox: title, lead image, one-line description. */
export const Infobox = forwardRef<HTMLElement, Props>(function Infobox({ endpoint, className, credit = true }, ref) {
  const info = endpointInfo(endpoint);
  const c = info.image?.credit;
  return (
    <figure ref={ref} className={`infobox ${className ?? ''}`}>
      <figcaption className="ib-title">{info.title}</figcaption>
      {info.image && (
        <div className="ib-img">
          <img src={info.image.src} alt="" draggable={false} />
        </div>
      )}
      <p className="ib-desc">{info.description}</p>
      {credit && c && (
        <p className="ib-credit">
          {c.artist} · {c.license}
        </p>
      )}
    </figure>
  );
});
