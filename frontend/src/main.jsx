import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CalendarDays,
  MapPin,
  Video,
  CheckCircle,
  Brain,
  Sparkles,
  Phone,
  Mail,
  Clock,
  GraduationCap,
  Tag,
  User,
  AtSign,
  MessageCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import './style.css';
import logo from './assets/logo.png';
import infinitoFooter from './assets/INFINIT.png';

const API = import.meta.env.VITE_API_URL || 'http://192.168.0.39:8080';

const levelLabels = {
  REGULAR: 'Redovna nastava / osnovna i srednja škola',
  MALA_MATURA: 'Priprema za malu maturu',
  TAKMICENJE: 'Matematička gimnazija / takmičenja / prijemni za fakultet',
  FAKULTET: 'Fakultetsko gradivo'
};

const days = [
  { key: 1, label: 'Ponedeljak' },
  { key: 2, label: 'Utorak' },
  { key: 3, label: 'Sreda' },
  { key: 4, label: 'Četvrtak' },
  { key: 5, label: 'Petak' },
  { key: 6, label: 'Subota' }
];

const times = ['10:00', '11:45', '13:30', '15:15', '17:00', '18:45'];

const timeLabels = {
  '10:00': '10:00 — 11:30',
  '11:45': '11:45 — 13:15',
  '13:30': '13:30 — 15:00',
  '15:15': '15:15 — 16:45',
  '17:00': '17:00 — 18:30',
  '18:45': '18:45 — 20:15'
};

function formatDate(iso) {
  return new Intl.DateTimeFormat('sr-RS', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(iso));
}

function getTime(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function shortDate(date) {
  return `${date.getDate()}.${date.getMonth() + 1}.`;
}

function weekLabel(start) {
  const end = addDays(start, 5);

  const formatter = new Intl.DateTimeFormat('sr-RS', {
    day: 'numeric',
    month: 'long'
  });

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

function priceFor(level) {
  return level === 'FAKULTET' ? 3000 : level === 'TAKMICENJE' ? 2500 : 2000;
}

function App() {
  const [slots, setSlots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    studentName: '',
    email: '',
    level: 'REGULAR',
    topic: ''
  });
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [riddleAnswer, setRiddleAnswer] = useState(null);
  const [cancelCode, setCancelCode] = useState('');
  const [cancelMsg, setCancelMsg] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [adminMode, setAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const minWeekStart = startOfWeek(new Date());
const maxWeekStart = addDays(minWeekStart, 14);
const [showAdminLogin, setShowAdminLogin] = useState(false);
const [adminError, setAdminError] = useState('');

  useEffect(() => {
    fetch(`${API}/api/slots`)
      .then(r => r.json())
      .then(setSlots)
      .catch(() =>
        setMsg({ type: 'err', text: 'Backend nije pokrenut ili API URL nije podešen.' })
      );
  }, []);

  const booked = slots.filter(s => s.booked);
  const selectedPrice = useMemo(() => priceFor(form.level), [form.level]);

  const weekDays = useMemo(() => {
    return days.map((day, index) => {
      const date = addDays(weekStart, index);

      return {
        ...day,
        date,
        dateKey: dateKey(date)
      };
    });
  }, [weekStart]);
  

  const schedule = useMemo(() => {
    const result = {};

    for (const time of times) {
      result[time] = {};

      for (const day of weekDays) {
        result[time][day.dateKey] = null;
      }
    }

    for (const slot of slots) {
      const d = new Date(slot.startTime);
      const time = getTime(slot.startTime);
      const key = dateKey(d);

      if (result[time] && key in result[time]) {
        result[time][key] = slot;
      }
    }

    return result;
  }, [slots, weekDays]);

  async function toggleBlock(slot) {
  try {
    const res = await fetch(`${API}/api/admin/slots/${slot.id}/toggle-block`, {
  method: 'POST',
  headers: {
    'X-Admin-Password': adminPassword
  }
});

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Greška pri promeni termina.');
    }

    setSlots(prev =>
      prev.map(s => s.id === data.id ? data : s)
    );

    setSelected(null);
  } catch (e) {
    setMsg({ type: 'err', text: e.message });
  }
}
  async function reserve(e) {
    e.preventDefault();
    if (!selected) return;

    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`${API}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, slotId: selected.id, price: selectedPrice })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Greška pri rezervaciji');

setMsg({
  type: 'ok',
  booking: {
    studentName: data.studentName,
    startTime: data.startTime,
    online: data.online,
    price: data.price,
    cancellationCode: data.cancellationCode
  }
});

      setSelected(null);
      setForm({ studentName: '', email: '', level: 'REGULAR', topic: '' });

      const fresh = await fetch(`${API}/api/slots`).then(r => r.json());
      setSlots(fresh);
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setLoading(false);
    }
  }
  async function cancelBooking(e) {
  e.preventDefault();

  if (!cancelCode.trim()) return;

  setCancelLoading(true);
  setCancelMsg(null);

  try {
    const res = await fetch(`${API}/api/bookings/cancel/${cancelCode.trim()}`, {
      method: 'POST'
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Greška pri otkazivanju termina.');
    }

    setCancelMsg({
      type: 'ok',
      text: `Termin je otkazan. Kod: ${cancelCode.trim()}`
    });

    setCancelCode('');

    const fresh = await fetch(`${API}/api/slots`).then(r => r.json());
    setSlots(fresh);
  } catch (err) {
    setCancelMsg({
      type: 'err',
      text: err.message
    });
    } finally {
    setCancelLoading(false);
  }
}

async function adminLogin(e) {
  e.preventDefault();
  setAdminError('');

  try {
    const res = await fetch(`${API}/api/admin/login`, {
      method: 'POST',
      headers: {
        'X-Admin-Password': adminPassword
      }
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Pogrešna lozinka.');
    }

    setAdminMode(true);
    setShowAdminLogin(false);
  } catch (err) {
    setAdminError(err.message);
  }
}

  return (
    <>
      <header className="hero">
        <nav className="topNav">
          <div className="brand">
            <img
              className="brandLogo"
              src={logo}
              alt="Škola matematike Infinito logo"
            />

            <div className="brandText">
             <div className="brandTop">Škola matematike</div>
    <div className="brandBottom">INFINITO</div>
            </div>
          </div>
<div className="links">

  <a href="#zakazivanje" className="navItem">
    <CalendarDays size={22}/>
    <span>Zakazivanje</span>
  </a>

  <a href="#cenovnik" className="navItem">
    <Tag size={22}/>
    <span>Cenovnik</span>
  </a>

  <a href="#o-meni" className="navItem">
    <User size={22}/>
    <span>O meni</span>
  </a>

  <a href="#kontakt" className="navItem">
    <Phone size={22}/>
    <span>Kontakt</span>
  </a>
<a href="#otkazivanje" className="navItem">
  <RefreshCw size={22}/>
  <span>Izmena termina</span>
</a>
  <a className="navCta" href="#zakazivanje">
    <CalendarDays size={20}/>
    <span>Zakaži čas</span>
  </a>

</div>
        </nav>

        <div className="heroGrid">
          <section className="heroContent">
            <p className="eyebrow">Škola matematike Infinito</p>

            <h1>
              Matematika koja
              <span> konačno ima smisla.</span>
            </h1>

            <p className="lead">
             	Individualni časovi matematike za osnovnu školu, srednju školu,
		takmičenja, prijemne ispite i fakultetsko gradivo.
            </p>

            <div className="heroActions">
              <a className="cta" href="#zakazivanje">Zakaži čas</a>
              <a className="secondaryCta" href="#cenovnik">Pogledaj cenovnik</a>
            </div>

            <div className="heroBadges">
              <span><Video size={16}/> Online časovi</span>
              <span><MapPin size={16}/> Novi Beograd</span>
              <span><Clock size={16}/> 90 min</span>
            </div>
          </section>

          <aside className="heroCard heroFeature">
            <Sparkles />
            <p className="eyebrow">Kako radimo?</p>
            <h3>Bez panike, bez preskakanja, bez učenja napamet.</h3>
            <p>
              Prvo otkrivamo gde nastaje problem, zatim gradimo razumevanje kroz
              primere, objašnjenja i zadatke. Svaki čas ima jasan cilj i plan za dalje.
            </p>

            <div className="miniStats">
              <div><b>1:1</b><span>individualan rad</span></div>
              <div><b>90</b><span>minuta časa</span></div>
              <div><b>4</b><span>nivoa nastave</span></div>
            </div>
          </aside>
        </div>
      </header>

      <main>
        <section className="section how">
          <h2>Način rada</h2>

          <div className="methodGrid">
            <div className="methodCard">
              <Brain />
              <h3>Individualan pristup</h3>
              <p>Tempo rada i zadaci se prilagođavaju učeniku.</p>
            </div>

            <div className="methodCard">
              <GraduationCap />
              <h3>Jasno objašnjenje</h3>
              <p>Svaku oblast rastavljamo na korake, bez preskakanja osnova.</p>
            </div>

            <div className="methodCard">
              <Clock />
              <h3>Plan rada</h3>
              <p>Posle časa učenik zna šta dalje treba da vežba.</p>
            </div>

            <div className="methodCard">
              <CheckCircle />
              <h3>Priprema za cilj</h3>
              <p>Kontrolni, prijemni, takmičenja, mala matura ili fakultet.</p>
            </div>
          </div>
        </section>

        <section id="zakazivanje" className="section">
          <div className="sectionHead">
            <CalendarDays />
            <div>
              <h2>Zakaži termin</h2>
              <p>Izaberi slobodan termin. Za online čas email je obavezan zbog Google Meet linka.</p>
            </div>
          </div>

{msg && msg.type === 'ok' && msg.booking && (
  <div className="successBox">
    <div className="successIcon">✓</div>

    <div>
      <h3>Termin je uspešno rezervisan</h3>

      <p>
        {msg.booking.studentName}, {formatDate(msg.booking.startTime)} —{' '}
        {msg.booking.online ? 'online' : 'uživo'}, {msg.booking.price} RSD
      </p>

      <div className="cancelCodeBox">
        <span>Kod za otkazivanje</span>
        <strong>{msg.booking.cancellationCode}</strong>
      </div>

      <small>Sačuvajte ovaj kod ukoliko budete želeli da otkažete termin.</small>
    </div>
  </div>
)}

{msg && msg.type === 'err' && (
  <div className="notice err">{msg.text}</div>
)}

         <div className="bookingGrid">
  <div className="scheduleWrap">

 <div className="weekNavigation">
  <button
    type="button"
    className="weekArrow"
    onClick={() =>
      setWeekStart(prev => {
        const next = addDays(prev, -7);
        return next < minWeekStart ? minWeekStart : next;
      })
    }
    disabled={weekStart <= minWeekStart}
  >
    ‹
  </button>

  <div className="weekTitle">
    {weekLabel(weekStart)}
  </div>

  <button
    type="button"
    className="weekArrow"
    onClick={() =>
      setWeekStart(prev => {
        const next = addDays(prev, 7);
        return next > maxWeekStart ? maxWeekStart : next;
      })
    }
    disabled={weekStart >= maxWeekStart}
  >
    ›
  </button>
</div>

    <table className="scheduleTable">
                <thead>
                  <tr>
                    <th>Vreme</th>
                    {weekDays.map(day => (
  <th key={day.dateKey}>
    <div>{day.label}</div>
    <small>{shortDate(day.date)}</small>
  </th>
))}
                  </tr>
                </thead>

                <tbody>
                  {times.map(time => (
                    <tr key={time}>
                      <td className="timeCell">{timeLabels[time]}</td>
                     {weekDays.map(day => {
 			 const slot = schedule[time][day.dateKey];

                        if (!slot) return <td key={day.dateKey} className="emptyCell">—</td>;

                        if (slot.booked) {
                          return (
                            <td key={day.dateKey}>
                              <button className="slotCell bookedCell" disabled>
                                Zauzeto
                                {slot.reservedBy && <small>{slot.reservedBy}</small>}
                              </button>
                            </td>
                          );
                        }
                        if (slot.blocked) {
  return (
    <td key={day.dateKey}>
      <button
        className="slotCell blockedCell"
        onClick={() => adminMode && toggleBlock(slot)}
        disabled={!adminMode}
      >
        Nedostupno
        {adminMode && <small>Klikni da otvoriš</small>}
      </button>
    </td>
  );
}

                        return (
                          <td key={day.dateKey}>
                            <button
onClick={() => {
  if (adminMode) {
    toggleBlock(slot);
  } else {
    setSelected(slot);
  }
}}
                              className={selected?.id === slot.id ? 'slotCell active' : 'slotCell'}
                            >
                              {slot.online ? <><Video size={15} /> Online</> : <><MapPin size={15} /> Uživo</>}
                              <small>90 min</small>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form className="form" onSubmit={reserve}>
              <h3>Podaci za rezervaciju</h3>

              {selected ? (
                <p className="chosen">
                  <CheckCircle size={16} />
                  {formatDate(selected.startTime)} — {selected.online ? 'online' : 'uživo'}
                </p>
              ) : (
                <p className="muted">Prvo izaberi termin iz tabele.</p>
              )}

              <label>
                Ime učenika
                <input
                  required
                  value={form.studentName}
                  onChange={e => setForm({ ...form, studentName: e.target.value })}
                />
              </label>

           <label>
  Email
  <input
    type="email"
    required
    value={form.email}
    onChange={e => setForm({ ...form, email: e.target.value })}
  />
</label>

             

              <label>
                Šta radimo?
                <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
                  {Object.entries(levelLabels).map(([k, v]) => <option value={k} key={k}>{v}</option>)}
                </select>
              </label>

              <label>
                Oblast / kratak opis
                <textarea
                  required
                  rows="4"
                  placeholder="npr. kvadratne jednačine, geometrija, izvodi..."
                  value={form.topic}
                  onChange={e => setForm({ ...form, topic: e.target.value })}
                />
              </label>

              <div className="price">Cena časa: <b>{selectedPrice} RSD</b></div>

              <button className="submit" disabled={!selected || loading}>
                {loading ? 'Zakazujem...' : 'Rezerviši termin'}
              </button>
            </form>
          </div>
        </section>

        <section id="cenovnik" className="section alt">
          <h2>Cenovnik za školsku 2026/27.</h2>

          <div className="prices">
            <Price title="Redovna nastava" a="90 min — 2000 RSD" b="60 min — 1500 RSD" />
            <Price title="Mala matura" a="90 min — 2000 RSD" b="60 min — 1500 RSD" />
            <Price title="Takmičenja i prijemni za fakultete i Matematičku gimnaziju" a="90 min — 2500 RSD" b="60 min — 2000 RSD" />
            <Price title="Fakultetsko gradivo" a="90 min — 3000 RSD" b="60 min — 2500 RSD" />
          </div>
        </section>

        <section id="o-meni" className="section about">
          <Brain />
          <div>
            <h2>O meni</h2>
            <p>Ja sam Ana Vučićević, imam 24 godine. Završila sam Matematičku gimnaziju u Beogradu i studiram na Matematičkom fakultetu u Beogradu.</p>
            <p>Imam višegodišnje iskustvo u držanju individualnih časova, kao i iskustvo rada sa decom predškolskog i osnovnoškolskog uzrasta u školi matematike Kliker i Klikerčić.</p>
          </div>
        </section>

        <section className="section riddleSection">
          <div className="riddleIntro">
            <p className="eyebrow center">Zagonetka nedelje</p>
            <h2>Probaj da rešiš bez papira.</h2>
            <p>
              Kratak logički izazov za zagrevanje mozga — klikni na odgovor i odmah vidi objašnjenje.
            </p>
          </div>

          <div className="riddle">
            <div className="riddleBadge">✨ Nedeljni izazov</div>

            <p className="riddleQuestion">
              Zamisli broj. Pomnoži ga sa 3, dodaj 12, zatim sve podeli sa 3.
              Dobiješ 9. Koji broj si zamislio?
            </p>

            <div className="answers">
              {[1, 3, 5, 7].map(value => (
                <button
                  key={value}
                  onClick={() => setRiddleAnswer(value)}
                  className={
                    riddleAnswer === value
                      ? value === 5
                        ? 'answer correctAnswer'
                        : 'answer wrongAnswer'
                      : 'answer'
                  }
                >
                  {value}
                </button>
              ))}
            </div>

            {riddleAnswer !== null && (
              <div className={riddleAnswer === 5 ? 'riddleMsg correct' : 'riddleMsg wrong'}>
                {riddleAnswer === 5 ? (
                  <>
                    <h3>Tačno! 🎉</h3>
                    <p>
                      Ako je zamišljeni broj <b>x</b>, onda je
                      <b> (3x + 12) / 3 = 9</b>. Množimo obe strane sa 3:
                      <b> 3x + 12 = 27</b>. Oduzmemo 12:
                      <b> 3x = 15</b>, pa je <b>x = 5</b>.
                    </p>
                  </>
                ) : (
                  <>
                    <h3>Skoro, ali nije to. 🙂</h3>
                    <p>
                      Označimo zamišljeni broj sa <b>x</b>. Dobijamo jednačinu
                      <b> (3x + 12) / 3 = 9</b>. Kada je rešimo:
                      <b> 3x + 12 = 27</b>, zatim <b>3x = 15</b>,
                      pa je tačan odgovor <b>5</b>.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="section">
          <h2>Već rezervisani termini</h2>
          <div className="booked">
            {booked.length ? booked.map(s => (
              <div key={s.id}>
                {formatDate(s.startTime)} — rezervisano {s.reservedBy ? `(${s.reservedBy})` : ''}
              </div>
            )) : <p>Nema rezervisanih termina.</p>}
          </div>
        </section>
       <section
  id="otkazivanje"
  className="section cancelSection"
>
  <div className="cancelCard">
    <div className="cancelIcon">
      <XCircle />
    </div>

    <div>
      <p className="eyebrow">Otkazivanje termina</p>
      <h2>Želiš da otkažeš čas?</h2>
      <p className="cancelText">
        Unesi kod za otkazivanje koji si dobio/la prilikom rezervacije.
        Primer koda: <b>pon0906-1145</b>
      </p>

      {cancelMsg && (
        <div className={cancelMsg.type === 'ok' ? 'notice ok' : 'notice err'}>
          {cancelMsg.text}
        </div>
      )}

      <form className="cancelForm" onSubmit={cancelBooking}>
        <input
          value={cancelCode}
          onChange={e => setCancelCode(e.target.value)}
          placeholder="npr. pon0906-1145"
        />

        <button type="submit" disabled={cancelLoading}>
          {cancelLoading ? 'Otkazujem...' : 'Otkaži termin'}
        </button>
      </form>
    </div>
  </div>
</section>

       <section id="kontakt" className="section contactSection">
  <div className="sectionHead">
  <MessageCircle />

  <div>
    <h2>Kontakt</h2>
    <p>Za pitanja, dogovor oko termina ili dodatne informacije.</p>
  </div>
</div>

  <div className="contactGrid">
  <a href="tel:+381692305002" className="contactCard">

  <div className="contactIcon">
    <Phone />
  </div>

  <small>TELEFON</small>

  <span>069 230 5002</span>

  <div className="contactButton">
    Pozovi
  </div>

</a>

    <a href="mailto:avucicevic2002@gmail.com" className="contactCard">

  <div className="contactIcon">
    <Mail />
  </div>

  <small>EMAIL</small>

  <span>avucicevic2002@gmail.com</span>

  <div className="contactButton">
    Pošalji email
  </div>

</a>

    <a
 href="https://instagram.com/infinito_skola"
 target="_blank"
 rel="noreferrer"
 className="contactCard"
>

  <div className="contactIcon">
    <AtSign />
  </div>

  <small>INSTAGRAM</small>

  <span>@infinito_skola</span>

  <div className="contactButton">
    Poseti profil
  </div>

</a>

   <div className="contactCard workCard">
      <Clock />
      <small>Radno vreme</small>
      <span>Pon–Pet 10:00–20:15</span>
      <span>Sub 17:00–20:15</span>
    </div>
  </div>
</section>
      </main>
<footer>

  <img
    src={infinitoFooter}
    alt="Infinito"
    className="footerBrandLogo"
  />

  <h3>Škola matematike Infinito</h3>

  <p className="footerTagline">
    Online časovi • Novi Beograd
  </p>

  <p className="footerPrograms">
    Prijemni ispiti • Takmičenja • Fakultet
  </p>

  <div className="footerContacts">
    <span>📞 069 230 5002</span>
    <span>✉ avucicevic2002@gmail.com</span>
    <span>📷 @infinito_skola</span>
  </div>

  <div className="footerBottom">
    © 2026 Škola matematike Infinito
  </div>
<div className="adminArea">
  {!adminMode && !showAdminLogin && (
    <button
      type="button"
      className="adminLink"
      onClick={() => setShowAdminLogin(true)}
    >
      Admin
    </button>
  )}

  {!adminMode && showAdminLogin && (
    <form className="adminLogin" onSubmit={adminLogin}>
      <input
        type="password"
        placeholder="Admin lozinka"
        value={adminPassword}
        onChange={e => setAdminPassword(e.target.value)}
        autoFocus
      />

      <button type="submit">
        Uđi
      </button>

      <button
        type="button"
        onClick={() => {
          setShowAdminLogin(false);
          setAdminPassword('');
          setAdminError('');
        }}
      >
        Otkaži
      </button>

      {adminError && (
        <small className="adminError">{adminError}</small>
      )}
    </form>
  )}

  {adminMode && (
    <div className="adminActive">
      <span>Admin režim je uključen</span>

      <button
        type="button"
        onClick={() => {
          setAdminMode(false);
          setAdminPassword('');
        }}
      >
        Odjavi se
      </button>
    </div>
  )}
</div>
</footer>
    </>
  );
}

function Price(p) {
  return (
    <div className="priceCard">
      <h3>{p.title}</h3>
      <p>{p.a}</p>
      <p>{p.b}</p>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
