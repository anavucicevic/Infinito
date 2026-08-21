package com.infinito.booking;

import com.infinito.calendar.CalendarService;
import com.infinito.email.EmailService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;

import java.time.*;
import java.util.*;

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
        return slots.findAll()
                .stream()
                .sorted(Comparator.comparing(x -> x.startTime))
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

        if (!slot.startTime.isAfter(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", "Nije moguće rezervisati termin koji je već prošao.")
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

        int price = priceFor(req.level);

        Booking booking = new Booking();

        booking.studentName = req.studentName.trim();
        booking.email = req.email.trim();
        booking.phone = null;
        booking.level = req.level;
        booking.topic = req.topic;
        booking.price = price;
        booking.online = slot.online;
        booking.startTime = slot.startTime;
        booking.endTime = slot.endTime;
        booking.cancelled = false;
        booking.cancellationCode = createCancellationCode(slot.startTime);

        var cal = calendar.createEvent(booking);

        booking.calendarEventId = cal.eventId();
        booking.meetLink = cal.meetLink();

        bookings.save(booking);

        slot.booked = true;
        slot.reservedBy = req.studentName;
        slot.price = price;
        slots.save(slot);

        try {
            email.sendBookingEmails(booking);
        } catch (Exception e) {
            System.err.println("Email nije poslat: " + e.getMessage());
        }

        return ResponseEntity.ok(booking);
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

        calendar.deleteEvent(booking.calendarEventId);

        booking.cancelled = true;
        bookings.save(booking);

        try {
            email.sendCancellationEmails(booking);
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

            lessonSlot.booked = false;
            lessonSlot.reservedBy = null;
            lessonSlot.price = null;

            slots.save(lessonSlot);
        }

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Termin je uspešno otkazan.",
                        "cancellationCode",
                        booking.cancellationCode
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

    slot.blocked = !Boolean.TRUE.equals(slot.blocked);
    slots.save(slot);

    return ResponseEntity.ok(slot);
}
    private int priceFor(String level) {
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
