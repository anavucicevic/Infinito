package com.infinito.booking;

import com.infinito.calendar.CalendarService;
import com.infinito.email.EmailService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import java.time.LocalDateTime;
import java.time.*;
import java.util.*;
import java.time.ZoneId;

@RestController
@RequestMapping("/api")
public class BookingController {

    private final LessonSlotRepository slots;
    private final BookingRepository bookings;
    private final CalendarService calendar;
    private final EmailService email;
    @Value("${app.admin.password}")
private String adminPassword;

    public BookingController(
            LessonSlotRepository s,
            BookingRepository b,
            CalendarService c,
            EmailService e
    ) {
        slots = s;
        bookings = b;
        calendar = c;
        email = e;
    }

@GetMapping("/slots")
public List<LessonSlot> slots() {
    LocalDateTime now =
            LocalDateTime.now(ZoneId.of("Europe/Belgrade"));

    LocalDateTime earliestAllowed = now.plusHours(4);

    return slots.findAll()
            .stream()
            .filter(slot -> slot.startTime.isAfter(now))
            .filter(slot ->
                    slot.booked
                    || Boolean.TRUE.equals(slot.blocked)
                    || slot.startTime.isAfter(earliestAllowed)
            )
            .sorted(Comparator.comparing(slot -> slot.startTime))
            .toList();
}

    @PostMapping("/bookings")
    public ResponseEntity<?> book(@RequestBody BookingRequest req) {

        Optional<LessonSlot> slotOptional = slots.findById(req.slotId);

        if (slotOptional.isEmpty()) {
            return ResponseEntity.status(404).body(
                    Map.of("message", "Termin nije pronađen.")
            );
        }

        LessonSlot slot = slotOptional.get();

        if (slot.booked) {
            return ResponseEntity.status(409).body(
                    Map.of("message", "Termin je već zauzet.")
            );
        }
        if (Boolean.TRUE.equals(slot.blocked)) {
    return ResponseEntity.status(409).body(
            Map.of("message", "Ovaj termin trenutno nije dostupan.")
    );
}
if (!slot.startTime.isAfter(LocalDateTime.now(ZoneId.of("Europe/Belgrade")).plusHours(4))) {
    return ResponseEntity.badRequest().body(
            Map.of("message", "Termin je moguće rezervisati najkasnije 4 sata pre početka časa.")
    );
}

        if (req.studentName == null || req.studentName.isBlank()) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", "Ime je obavezno.")
            );
        }

        if (req.email == null || req.email.isBlank()) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", "Email je obavezan.")
            );
        }

        if (req.level == null || req.level.isBlank()) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", "Nivo nastave je obavezan.")
            );
        }

        int duration = req.duration != null ? req.duration : 90;
int price = priceFor(req.level, duration);

System.out.println(
        "BOOKING DEBUG -> level=" + req.level
        + ", duration=" + duration
        + ", price=" + price
);

        Booking booking = new Booking();

        booking.studentName = req.studentName.trim();
        booking.email = req.email.trim();
        booking.phone = null;
        booking.level = req.level;
        booking.topic = req.topic;
       booking.price = price;
       booking.duration = req.duration != null ? req.duration : 90;
       boolean isFriday = slot.startTime.getDayOfWeek() == DayOfWeek.FRIDAY;

booking.online = isFriday
        ? true
        : Boolean.TRUE.equals(req.online);
       booking.startTime = slot.startTime;
       booking.endTime = booking.duration == 60
           ? slot.startTime.plusMinutes(60)
           : slot.endTime;
        booking.cancelled = false;
        booking.status = "ZAKAZANO";
        booking.cancellationCode = createCancellationCode(slot.startTime);

        var cal = calendar.createEvent(booking);

        booking.calendarEventId = cal.eventId();
        booking.meetLink = cal.meetLink();

        bookings.save(booking);

slot.booked = true;
slot.reservedBy = req.studentName;
slot.price = price;
slot.status = "ZAKAZANO";
slot.bookingId = booking.id;
slots.save(slot);

        try {
            email.sendBookingEmails(booking);
        } catch (Exception e) {
            System.err.println("Email nije poslat: " + e.getMessage());
        }

        return ResponseEntity.ok(booking);
    }
@GetMapping("/bookings/cancel/{code}/check")
public ResponseEntity<?> checkCancellation(@PathVariable String code) {

    String normalizedCode = code.trim().toLowerCase();

    Optional<Booking> found = bookings.findAll()
            .stream()
            .filter(b -> b.cancellationCode != null)
            .filter(b -> b.cancellationCode.equalsIgnoreCase(normalizedCode))
            .filter(b -> !b.cancelled)
            .findFirst();

    if (found.isEmpty()) {
        return ResponseEntity.status(404).body(
                Map.of("message", "Nije pronađena aktivna rezervacija sa tim kodom.")
        );
    }

    Booking booking = found.get();
    LocalDateTime now = LocalDateTime.now(ZoneId.of("Europe/Belgrade"));

    if (!booking.startTime.isAfter(now)) {
        return ResponseEntity.badRequest().body(
                Map.of("message", "Termin koji je već počeo nije moguće otkazati.")
        );
    }

    boolean lateCancellation =
            !booking.startTime.isAfter(now.plusHours(4));

    return ResponseEntity.ok(
            Map.of(
                    "lateCancellation", lateCancellation,
                    "startTime", booking.startTime
            )
    );
}
    @PostMapping("/bookings/cancel/{code}")
    public ResponseEntity<?> cancel(@PathVariable String code) {

        String normalizedCode = code.trim().toLowerCase();

        Optional<Booking> found = bookings.findAll()
                .stream()
                .filter(b -> b.cancellationCode != null)
                .filter(b -> b.cancellationCode.equalsIgnoreCase(normalizedCode))
                .filter(b -> !b.cancelled)
                .findFirst();

        if (found.isEmpty()) {
            return ResponseEntity.status(404).body(
                    Map.of(
                            "message",
                            "Nije pronađena aktivna rezervacija sa tim kodom."
                    )
            );
        }

        Booking booking = found.get();
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Europe/Belgrade"));

if (!booking.startTime.isAfter(now)) {
    return ResponseEntity.badRequest().body(
            Map.of("message", "Termin koji je već počeo nije moguće otkazati.")
    );
}

boolean lateCancellation =
        !booking.startTime.isAfter(now.plusHours(4));

        calendar.deleteEvent(booking.calendarEventId);

        booking.cancelled = true;
        booking.status = "OTKAZANO";
        bookings.save(booking);

        try {
            email.sendCancellationEmails(booking, lateCancellation);
        } catch (Exception e) {
            System.err.println(
                    "Email o otkazivanju nije poslat: " + e.getMessage()
            );
        }

        Optional<LessonSlot> slot = slots.findAll()
                .stream()
                .filter(s -> s.startTime.equals(booking.startTime))
                .findFirst();

       if (slot.isPresent()) {
    LessonSlot lessonSlot = slot.get();

    if (lateCancellation) {
        lessonSlot.booked = true;
        lessonSlot.status = "OTKAZANO";
    } else {
        lessonSlot.booked = false;
        lessonSlot.status = null;
        lessonSlot.reservedBy = null;
        lessonSlot.price = null;
        lessonSlot.bookingId = null;
    }

    slots.save(lessonSlot);
}

        return ResponseEntity.ok(
        Map.of(
                "message",
                lateCancellation
                        ? "Termin je otkazan. Otkazivanje je izvršeno manje od 4 sata pre početka časa i čas će biti naplaćen kao održan."
                        : "Termin je uspešno otkazan i ponovo je dostupan za rezervaciju.",
                "cancellationCode",
                booking.cancellationCode,
                "lateCancellation",
                lateCancellation
        )
);
    }
    @PostMapping("/admin/login")
public ResponseEntity<?> adminLogin(
        @RequestHeader(value = "X-Admin-Password", required = false) String password
) {
    if (password == null || !password.equals(adminPassword)) {
        return ResponseEntity.status(401).body(
                Map.of("message", "Pogrešna lozinka.")
        );
    }

    return ResponseEntity.ok(
            Map.of("message", "Prijava uspešna.")
    );
}

@GetMapping("/admin/slots")
public ResponseEntity<?> adminSlots(
        @RequestHeader(value = "X-Admin-Password", required = false) String password
) {
    if (password == null || !password.equals(adminPassword)) {
        return ResponseEntity.status(401).body(
                Map.of("message", "Pogrešna admin lozinka.")
        );
    }

    return ResponseEntity.ok(
            slots.findAll()
                    .stream()
                    .sorted(Comparator.comparing(slot -> slot.startTime))
                    .toList()
    );
}

@PostMapping("/admin/slots/{id}/toggle-block")
public ResponseEntity<?> toggleBlock(
        @PathVariable Long id,
        @RequestHeader(value = "X-Admin-Password", required = false) String password
) {

    if (password == null || !password.equals(adminPassword)) {
        return ResponseEntity.status(401).body(
                Map.of("message", "Pogrešna admin lozinka.")
        );
    }

    Optional<LessonSlot> found = slots.findById(id);

    if (found.isEmpty()) {
        return ResponseEntity.status(404).body(
                Map.of("message", "Termin nije pronađen.")
        );
    }

    LessonSlot slot = found.get();

    if (slot.booked) {
        return ResponseEntity.status(409).body(
                Map.of("message", "Rezervisan termin ne može biti zatvoren.")
        );
    }
    boolean openingSlot = Boolean.TRUE.equals(slot.blocked);

if (openingSlot) {
    LocalDateTime now =
            LocalDateTime.now(ZoneId.of("Europe/Belgrade"));

    if (!slot.startTime.isAfter(now.plusHours(4))) {
        return ResponseEntity.badRequest().body(
                Map.of("message", "Termin nije moguće otvoriti manje od 4 sata pre početka.")
        );
    }
}

    slot.blocked = !Boolean.TRUE.equals(slot.blocked);
    slots.save(slot);

    return ResponseEntity.ok(slot);
}

@PostMapping("/admin/slots/{id}/mark-held")
public ResponseEntity<?> markHeld(
        @PathVariable Long id,
        @RequestHeader(value = "X-Admin-Password", required = false) String password
) {
    if (password == null || !password.equals(adminPassword)) {
        return ResponseEntity.status(401).body(
                Map.of("message", "Pogrešna admin lozinka.")
        );
    }

    Optional<LessonSlot> slotOptional = slots.findById(id);

    if (slotOptional.isEmpty()) {
        return ResponseEntity.status(404).body(
                Map.of("message", "Termin nije pronađen.")
        );
    }

    LessonSlot slot = slotOptional.get();

    Optional<Booking> bookingOptional;

    if (slot.bookingId != null) {
        bookingOptional = bookings.findById(slot.bookingId);
    } else {
        bookingOptional = bookings.findAll()
                .stream()
                .filter(b -> !b.cancelled)
                .filter(b -> b.startTime.equals(slot.startTime))
                .findFirst();
    }

    if (bookingOptional.isEmpty()) {
        return ResponseEntity.status(404).body(
                Map.of("message", "Rezervacija za ovaj termin nije pronađena.")
        );
    }

    Booking booking = bookingOptional.get();

    booking.status = "ODRZANO";
    booking.cancelled = false;
    bookings.save(booking);

    slot.status = "ODRZANO";
    slot.bookingId = booking.id;
    slots.save(slot);

    return ResponseEntity.ok(slot);
}
 private int priceFor(String level, int duration) {
    if (duration == 60) {
        return switch (level) {
            case "FAKULTET" -> 2500;
            case "TAKMICENJE" -> 2000;
            case "REGULAR", "MALA_MATURA" -> 1500;
            default -> 1500;
        };
    }

    return switch (level) {
        case "FAKULTET" -> 3000;
        case "TAKMICENJE" -> 2500;
        case "REGULAR", "MALA_MATURA" -> 2000;
        default -> 2000;
    };
}

    private String createCancellationCode(LocalDateTime startTime) {

        String day = switch (startTime.getDayOfWeek()) {
            case MONDAY -> "pon";
            case TUESDAY -> "uto";
            case WEDNESDAY -> "sre";
            case THURSDAY -> "cet";
            case FRIDAY -> "pet";
            case SATURDAY -> "sub";
            case SUNDAY -> "ned";
        };

        String date = String.format(
                "%02d%02d",
                startTime.getDayOfMonth(),
                startTime.getMonthValue()
        );

        String time = String.format(
                "%02d%02d",
                startTime.getHour(),
                startTime.getMinute()
        );

        return day + date + "-" + time;
    }
}
