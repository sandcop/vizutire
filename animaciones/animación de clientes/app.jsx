const { useState, useEffect, useRef } = React;

const LOGOS = [
  { src: 'logos/bhp.png', alt: 'BHP Minera Spence' },
  { src: 'logos/codelco.png', alt: 'Codelco Ministro Hales' },
  { src: 'logos/kaltire.png', alt: 'Kal Tire' },
  { src: 'logos/lomas-bayas.png', alt: 'Lomas Bayas' },
  { src: 'logos/los-pelambres.png', alt: 'Los Pelambres' },
  { src: 'logos/michelin.png', alt: 'Michelin' },
];

function Marquee() {
  // Duplicate the list enough times for a seamless infinite loop
  const loop = [...LOGOS, ...LOGOS, ...LOGOS];

  return (
    <div className="banner">
      <div className="label">Clientes validados.</div>
      <div className="track-wrap">
        <div className="track">
          {loop.map((logo, i) => (
            <div className="logo-cell" key={i}>
              <img src={logo.src} alt={logo.alt} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Marquee />);
