import { REGIONS } from '../../game/engine'
import { assets, roadmap } from '../config'

export default function CaseStudy() {
  return (
    <section className="case-study" id="architecture" aria-labelledby="case-title">
      <div className="case-heading">
        <p className="eyebrow">Portfolio case study</p>
        <h2 id="case-title">A deterministic game engine behind a playable UI</h2>
        <p>
          The prototype is scoped around the central engineering idea from the
          design docs: every actor receives legal actions, submits an action ID,
          and lets the engine validate state changes.
        </p>
      </div>

      <div className="architecture-grid">
        <article>
          <p className="small-label">Engine</p>
          <h3>Pure rules</h3>
          <p>
            Board generation, neighbor lookup, liberties, captures, suicide
            prevention, Domains, economy, pressure, cards, warnings, and
            mandates live outside React.
          </p>
        </article>
        <article>
          <p className="small-label">Controller</p>
          <h3>Validated actions</h3>
          <p>
            Humans, bots, the debug panel, the window API, and BroadcastChannel
            messages all submit the same selected action ID.
          </p>
        </article>
        <article>
          <p className="small-label">Static deployment</p>
          <h3>Browser-local agents</h3>
          <p>
            The hosted app can expose an in-page protocol and invite URL without
            claiming real online multiplayer, a public HTTP API, or remote shared
            matches.
          </p>
        </article>
        <article>
          <p className="small-label">Bridge options</p>
          <h3>Deferred by design</h3>
          <p>
            A localhost bridge stays optional until Browser Agent Mode is proven.
            A real backend would need persistence, an action validation endpoint,
            an event stream, a match store, and seat tokens.
          </p>
        </article>
      </div>

      <div className="asset-gallery" aria-label="Go-Game design assets">
        <figure>
          <img src={assets.board} alt="Hex Sovereign board interface concept" />
          <figcaption>Board composition reference</figcaption>
        </figure>
        <figure>
          <img src={assets.ui} alt="Hex Sovereign component sheet" />
          <figcaption>UI component sheet</figcaption>
        </figure>
        <figure>
          <img src={assets.cards} alt="Hex Sovereign cards and decrees sheet" />
          <figcaption>Cards and decree reference</figcaption>
        </figure>
      </div>

      <div
        className="roadmap-band"
        id="roadmap"
        style={{ '--roadmap-backdrop': `url(${assets.cards})` }}
      >
        <div>
          <p className="eyebrow">Implemented path</p>
          <h2>Playable rules first, bridges only when needed</h2>
        </div>
        <ol>
          {roadmap.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </div>

      <div className="region-band" aria-label="Region identities">
        {REGIONS.map((region) => (
          <article className={`region-card region-${region.id}`} key={region.id}>
            <p>{region.name}</p>
            <span>{region.theme}</span>
          </article>
        ))}
      </div>
    </section>
  )
}
