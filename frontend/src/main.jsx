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

function priceFor(level, duration) {
  if (duration === 60) {
    return level === 'FAKULTET' ? 2500
      : level === 'TAKMICENJE' ? 2000
      : 1500;
  }

  return level === 'FAKULTET' ? 3000
    : level === 'TAKMICENJE' ? 2500
    : 2000;
}

const riddles = [
  {
    question:
      'Tri kutije su označene: „Jabuke“, „Kruške“ i „Jabuke i kruške“. Sve tri oznake su pogrešne. Smeš da izvučeš samo jedan plod iz jedne kutije. Iz koje kutije treba da izvučeš plod da bi mogao pravilno da označiš sve tri?',
    answers: ['Jabuke', 'Kruške', 'Jabuke i kruške', 'Nije moguće'],
    correct: 'Jabuke i kruške',
    explanation:
      'Pošto su sve oznake pogrešne, kutija označena „Jabuke i kruške“ sigurno nije mešovita. Jedan izvučen plod odmah otkriva šta je u toj kutiji, a zatim se preostale dve mogu pravilno odrediti.'
  },
  {
    question:
      'Zamisli broj. Pomnoži ga sa 3, dodaj 12, zatim sve podeli sa 3. Dobiješ 9. Koji broj si zamislio?',
    answers: [1, 3, 5, 7],
    correct: 5,
    explanation:
      'Ako je broj x, onda važi (3x + 12) / 3 = 9. Dobijamo 3x + 12 = 27, zatim 3x = 15, pa je x = 5.'
  },
  {
    question:
      'U fioci se nalazi 5 crnih i 5 belih čarapa. Vadiš ih u mraku i ne vidiš boju. Koliko najmanje čarapa moraš da izvučeš da bi bio siguran da imaš dve iste boje?',
    answers: [2, 3, 5, 6],
    correct: 3,
    explanation:
      'U najgorem slučaju prve dve čarape su različitih boja. Treća mora biti iste boje kao jedna od prve dve, pa su 3 dovoljne.'
  },
  {
    question:
      'Koji broj nedostaje u nizu: 2, 6, 12, 20, 30, ?',
    answers: [36, 40, 42, 44],
    correct: 42,
    explanation:
      'Razlike su redom 4, 6, 8 i 10. Sledeća razlika je 12, pa dobijamo 30 + 12 = 42.'
  },
  {
    question:
      'Sat pokazuje tačno 3:00. Koliki je ugao između male i velike kazaljke?',
    answers: ['30°', '60°', '90°', '120°'],
    correct: '90°',
    explanation:
      'Pun krug ima 360°, a sat je podeljen na 12 jednakih delova. Između svakog broja je 30°, pa između 12 i 3 ima 3 × 30° = 90°.'
  },
  {
    question:
      'Ana ima 4 ćerke. Svaka ćerka ima jednog brata. Koliko dece Ana ima?',
    answers: [4, 5, 8, 9],
    correct: 5,
    explanation:
      'Sve četiri ćerke mogu imati istog brata. Zato Ana ima 4 ćerke i 1 sina, ukupno 5 dece.'
  }
];

function App() {
  const [slots, setSlots] = useState([]);
  const [selected, setSelected] = useState(null);
 const [form, setForm] = useState({
  studentName: '',
  email: '',
  duration: 90,
  online: true,
  level: 'REGULAR',
  topic: ''
});
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [riddleAnswer, setRiddleAnswer] = useState(null);
  const [riddleTick, setRiddleTick] = useState(Date.now());
  const [cancelCode, setCancelCode] = useState('');
  const [cancelMsg, setCancelMsg] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [adminMode, setAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const minWeekStart = startOfWeek(new Date());
const maxWeekStart = addDays(minWeekStart, 21);
const [showAdminLogin, setShowAdminLogin] = useState(false);
const [adminError, setAdminError] = useState('');
const [openFaq, setOpenFaq] = useState(null);

const riddleIndex =
  Math.floor(riddleTick / (2 * 60 * 60 * 1000)) % riddles.length;

const currentRiddle = riddles[riddleIndex];

  useEffect(() => {
    fetch(`${API}/api/slots`)
      .then(r => r.json())
      .then(setSlots)
      .catch(() =>
        setMsg({ type: 'err', text: 'Backend nije pokrenut ili API URL nije podešen.' })
      );
  }, []);
  
  useEffect(() => {
  const interval = setInterval(() => {
    setRiddleTick(Date.now());
    setRiddleAnswer(null);
  }, 60 * 1000);

  return () => clearInterval(interval);
}, []);

  const booked = slots.filter(s => s.booked);
  const selectedPrice = useMemo(
  () => priceFor(form.level, form.duration),
  [form.level, form.duration]
);

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
    duration: data.duration,
    online: data.online,
    price: data.price,
    cancellationCode: data.cancellationCode
  }
});

      setSelected(null);
  setForm({
  studentName: '',
  email: '',
  duration: 90,
  online: true,
  level: 'REGULAR',
  topic: ''
});

      const fresh = await fetch(`${API}/api/slots`).then(r => r.json());
      setSlots(fresh);
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setLoading(false);
    }
  }
async function markHeld(slot) {
  try {
    const res = await fetch(
      `${API}/api/admin/slots/${slot.id}/mark-held`,
      {
        method: 'POST',
        headers: {
          'X-Admin-Password': adminPassword
        }
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Greška pri označavanju termina.');
    }

    setSlots(prev =>
      prev.map(s =>
        s.id === data.id ? data : s
      )
    );
  } catch (err) {
    setMsg({ type: 'err', text: err.message });
  }
}
  
  async function cancelBooking(e) {
  e.preventDefault();

  const code = cancelCode.trim();

  if (!code) return;

  setCancelLoading(true);
  setCancelMsg(null);

  try {
    const checkRes = await fetch(
      `${API}/api/bookings/cancel/${code}/check`
    );

    const checkData = await checkRes.json();

    if (!checkRes.ok) {
      throw new Error(
        checkData.message || 'Greška pri proveri termina.'
      );
    }

    if (checkData.lateCancellation) {
      const confirmed = window.confirm(
        'Kasno otkazivanje termina\n\n' +
        'Termin otkazujete manje od 4 sata pre početka časa. ' +
        'U skladu sa pravilima otkazivanja, čas će biti naplaćen kao održan.\n\n' +
        'Da li želite da nastavite sa otkazivanjem?'
      );

      if (!confirmed) {
        setCancelLoading(false);
        return;
      }
    }

    const res = await fetch(
      `${API}/api/bookings/cancel/${code}`,
      {
        method: 'POST'
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.message || 'Greška pri otkazivanju termina.'
      );
    }

    setCancelMsg({
      type: 'ok',
      text: data.message
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
    const adminSlots = await fetch(`${API}/api/admin/slots`, {
  headers: {
    'X-Admin-Password': adminPassword
  }
}).then(r => r.json());

setSlots(adminSlots);
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
<a href="#otkazivanje" className="navItem">
  <RefreshCw size={22}/>
  <span>Izmena termina</span>
</a>
  <a href="#cenovnik" className="navItem">
    <Tag size={22}/>
    <span>Cenovnik</span>
  </a>

  <a href="#o-meni" className="navItem">
    <User size={22}/>
    <span>O meni</span>
  </a>
  <a href="#izazov" className="navItem">
  <Brain size={22}/>
  <span>Izazov</span>
</a>
<a href="#faq" className="navItem">
  <MessageCircle size={22}/>
  <span>Česta pitanja</span>
</a>

  <a href="#kontakt" className="navItem">
    <Phone size={22}/>
    <span>Kontakt</span>
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
  <div><b>60/90</b><span>minuta po izboru</span></div>
  <div><b className="miniStatSmaller">Online / uživo</b><span>časovi</span></div>
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

  <div className="bookingInfo">
  <p>✉️ Svaki rezervisani termin potvrđujemo putem emaila.</p>
  <p>💻 Za online časove, Google Meet link stiže u potvrdi.</p>
  <p>📅 Dodatnih termina van prikazanih neće biti.</p>

  <div className="bookingWarning">
    <strong>Napomena:</strong> Nedolazak na zakazani čas ili otkazivanje neposredno
    pre početka časa smatraće se održanim terminom.
  </div>
</div>
</div>


</div>


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
  <th
  key={day.dateKey}
  className={day.dateKey === dateKey(new Date()) ? 'todayHeader' : ''}
>
    <div>{day.label}</div>
    <small>{shortDate(day.date)}</small>

    {day.date.getDay() === 5 && (
      <div className="onlineOnly">Samo online</div>
    )}
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
 			 const isPast = slot && new Date(slot.startTime) < new Date();

if (slot && isPast && !slot.booked && !slot.blocked) {
  return <td key={day.dateKey} className="emptyCell">—</td>;
}

                        if (!slot) return <td key={day.dateKey} className="emptyCell">—</td>;
                        if (adminMode && slot.status === 'ODRZANO') {
  return (
    <td key={day.dateKey}>
      <button className="slotCell heldCell" disabled>
        Održano
        {slot.reservedBy && <small>{slot.reservedBy}</small>}
      </button>
    </td>
  );
}

if (adminMode && slot.status === 'OTKAZANO') {
  return (
    <td key={day.dateKey}>
      <button className="slotCell cancelledCell" disabled>
        Otkazano
        {slot.reservedBy && <small>{slot.reservedBy}</small>}
      </button>
    </td>
  );
}

                       if (slot.booked) {
  const isPast = new Date(slot.startTime) < new Date();

  if (
    adminMode &&
    isPast &&
    (!slot.status || slot.status === 'ZAKAZANO')
  ) {
    return (
      <td key={day.dateKey}>
        <button
          className="slotCell bookedCell"
          onClick={() => markHeld(slot)}
        >
          Zakazano
          {slot.reservedBy && <small>{slot.reservedBy}</small>}
          <small>Klikni za „Održano“</small>
        </button>
      </td>
    );
  }

  return (
    <td key={day.dateKey}>
      <button className="slotCell bookedCell" disabled>
        {adminMode ? 'Zakazano' : 'Zauzeto'}
        {adminMode && slot.reservedBy && (
          <small>{slot.reservedBy}</small>
        )}
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

    const isFriday =
      new Date(slot.startTime).getDay() === 5;

    if (isFriday) {
      setForm(prev => ({
        ...prev,
        online: true
      }));
    }
  }
}}
                              className={selected?.id === slot.id ? 'slotCell active' : 'slotCell'}
                            >
                              Slobodno
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              {msg && msg.type === 'ok' && msg.booking && (
                <div className="successBox">
                  <div className="successIcon">✓</div>

                  <div>
                    <h3>Termin je uspešno rezervisan</h3>

                    <p>
                      {msg.booking.studentName}, {formatDate(msg.booking.startTime)} —{' '}
                      {msg.booking.duration || 90} min,{' '}
                      {msg.booking.online ? 'online' : 'uživo'}, {msg.booking.price} RSD
                    </p>

                    <div className="cancelCodeBox">
                      <span>Kod za otkazivanje</span>
                      <strong>{msg.booking.cancellationCode}</strong>
                    </div>

                    <small>
                      Sačuvajte ovaj kod ukoliko budete želeli da otkažete termin.
                    </small>
                  </div>
                </div>
              )}

              <form className="form" onSubmit={reserve}>
      
              <h3>Podaci za rezervaciju</h3>

              {selected ? (
  <div className="chosen bookingSummary">
    <CheckCircle size={16} />

    <div>
      <strong>{formatDate(selected.startTime)}</strong>
      <span>{form.duration} min</span>
      <span>{form.online ? 'Online' : 'Uživo'}</span>
      <span>{selectedPrice} RSD</span>
    </div>
  </div>
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
  Trajanje časa
  <select
    value={form.duration}
    onChange={e =>
      setForm({ ...form, duration: Number(e.target.value) })
    }
  >
    <option value={60}>60 min</option>
    <option value={90}>90 min</option>
  </select>
</label>  

<label>
  Način održavanja
  <select
    value={form.online ? 'online' : 'uzivo'}
    onChange={e =>
      setForm({ ...form, online: e.target.value === 'online' })
    }
    disabled={
      selected &&
      new Date(selected.startTime).getDay() === 5
    }
  >
    <option value="online">Online</option>
    <option value="uzivo">Uživo</option>
  </select>
</label>

{selected && new Date(selected.startTime).getDay() === 5 && (
  <small className="muted">
    Petkom su časovi dostupni samo online.
  </small>
)}

              <label>
                Šta radimo?
                <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
                  {Object.entries(levelLabels).map(([k, v]) => <option value={k} key={k}>{v}</option>)}
                </select>
              </label>

              <label>
                Oblast / kratak opis (nije obavezno)
                <textarea
                  rows="4"
                  placeholder="npr. kvadratne jednačine, prizma, izvodi..."
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
            <p>Ja sam Ana Vučićević, imam 24 godine. Završila sam Matematičku gimnaziju u Beogradu i apsolvent sam na Matematičkom fakultetu u Beogradu.</p>
            <p>Imam višegodišnje iskustvo u držanju individualnih časova, kao i iskustvo rada sa decom predškolskog i osnovnoškolskog uzrasta u školi matematike Kliker i Klikerčić.</p>
          </div>
        </section>

       <section id="izazov" className="section riddleSection">
  <div className="riddleIntro">
    <p className="eyebrow center">Matematički izazov</p>
    
  </div>

  <div className="riddle">
    <div className="riddleBadge">✨ Pokušaj da rešiš</div>

    <p className="riddleQuestion">
      {currentRiddle.question}
    </p>

    <div className="answers">
      {currentRiddle.answers.map(value => (
        <button
          key={value}
          onClick={() => setRiddleAnswer(value)}
          className={
            riddleAnswer === value
              ? value === currentRiddle.correct
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
      <div
        className={
          riddleAnswer === currentRiddle.correct
            ? 'riddleMsg correct'
            : 'riddleMsg wrong'
        }
      >
        {riddleAnswer === currentRiddle.correct ? (
          <>
            <h3>Tačno! 🎉</h3>
            <p>{currentRiddle.explanation}</p>
          </>
        ) : (
          <>
  		<h3>Skoro, ali nije to. 🙂</h3>
 		 <p>Pokušaj ponovo — možda postoji detalj koji si prevideo/la.</p>
          </>
        )}
      </div>
    )}
  </div>
</section>

       {adminMode && (
  <section className="section">
    <h2>Već rezervisani termini</h2>

    <div className="booked">
      {booked.length ? booked.map(s => (
        <div key={s.id}>
          {formatDate(s.startTime)} — rezervisano
          {s.reservedBy ? ` (${s.reservedBy})` : ''}
        </div>
      )) : (
        <p>Nema rezervisanih termina.</p>
      )}
    </div>
  </section>
)}
      
<section id="faq" className="section faqSection">
  <h2>Česta pitanja</h2>

  <div className="faqList">
    {[
      {
        q: 'Kako dobijam Google Meet link?',
        a: 'Nakon uspešne rezervacije online časa, Google Meet link stiže u email potvrdi.'
      },
      {
        q: 'Kako mogu da otkažem termin?',
        a: 'Termin možeš da otkažeš pomoću koda za otkazivanje koji dobijaš nakon rezervacije.'
      },
      {
        q: 'Gde se održavaju časovi uživo?',
        a: 'Časovi uživo održavaju se na Novom Beogradu, tačnu adresu dobijate u email potvrdi.'
      },
      {
        q: 'Koliko traje čas?',
        a: 'Možeš da izabereš trajanje od 60 ili 90 minuta prilikom rezervacije.'
      },
      {
        q: 'Šta ako ne dođem na čas ili otkažem neposredno pre početka?',
        a: 'Nedolazak na zakazani čas ili otkazivanje neposredno pre početka časa smatraće se održanim terminom i biće naplaćen kao takav.'
      },
      {
  q: 'Šta mi je potrebno za čas?',
  a: 'Donesi beleške sa časa, zbirku ili materijal koji koristite u školi, kao i svesku ili papir za vežbanje. Ako imaš konkretne zadatke ili pitanja, slobodno pripremi i njih.'
}
    ].map((item, index) => (
      <div className="faqItem" key={index}>
        <button
          type="button"
          className="faqQuestion"
          onClick={() => setOpenFaq(openFaq === index ? null : index)}
        >
          <span>{item.q}</span>
          <span>{openFaq === index ? '−' : '+'}</span>
        </button>

        {openFaq === index && (
          <div className="faqAnswer">
            {item.a}
          </div>
        )}
      </div>
    ))}
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
      <a href="#zakazivanje" className="mobileBookingCta">
  <CalendarDays size={18} />
  Zakaži čas
</a>
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
