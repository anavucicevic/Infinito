package com.infinito.email;

import com.infinito.booking.Booking;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

@Service
public class EmailService {

    private final JavaMailSender sender;

    @Value("${app.mail.enabled:false}")
    private boolean enabled;

    @Value("${app.owner-email}")
    private String ownerEmail;

    private final DateTimeFormatter formatter =
            DateTimeFormatter.ofPattern("dd.MM.yyyy. HH:mm");

    public EmailService(@Autowired(required = false) JavaMailSender sender) {
        this.sender = sender;
    }

    public void sendBookingEmails(Booking b) {
    System.out.println("MAIL ENABLED = " + enabled);
System.out.println("MAIL SENDER NULL = " + (sender == null));
        String ownerText = buildOwnerBookingText(b);
        String studentText = buildStudentBookingText(b);

        if (enabled && sender != null) {
            send(ownerEmail, "Nova rezervacija časa", ownerText);

            if (b.email != null && !b.email.isBlank()) {
                send(b.email, "Potvrda rezervacije časa", studentText);
            }
        } else {
            System.out.println("=== EMAIL ZA ANU ===");
            System.out.println(ownerText);

            if (b.email != null && !b.email.isBlank()) {
                System.out.println("=== EMAIL ZA UČENIKA ===");
                System.out.println(studentText);
            }
        }
    }

    public void sendCancellationEmails(Booking b, boolean lateCancellation) {
    String ownerText = buildOwnerCancellationText(b);
    String studentText = buildStudentCancellationText(b, lateCancellation);

        if (enabled && sender != null) {
            send(ownerEmail, "Otkazan čas", ownerText);

            if (b.email != null && !b.email.isBlank()) {
                send(b.email, "Otkazivanje časa", studentText);
            }
        } else {
            System.out.println("=== OTKAZIVANJE ZA ANU ===");
            System.out.println(ownerText);

            if (b.email != null && !b.email.isBlank()) {
                System.out.println("=== OTKAZIVANJE ZA UČENIKA ===");
                System.out.println(studentText);
            }
        }
    }

    private String buildOwnerBookingText(Booking b) {
        return """
                Nova rezervacija časa

                Učenik: %s
                Email: %s
                Telefon: %s

                Termin: %s - %s
                Tip: %s
                Nivo: %s
                Oblast/opis: %s
                Cena: %s RSD

                Kod za otkazivanje: %s
                %s
                """.formatted(
                safe(b.studentName),
                safe(b.email),
                safe(b.phone),
                b.startTime.format(formatter),
                b.endTime.format(formatter),
                b.online ? "Online" : "Uživo - Novi Beograd",
                safe(b.level),
                safe(b.topic),
                b.price,
                safe(b.cancellationCode),
                b.meetLink != null ? "Google Meet: " + b.meetLink : ""
        );
    }

    private String buildStudentBookingText(Booking b) {
    return """
            Zdravo %s,

            Vaš termin je uspešno rezervisan.

            Termin: %s - %s
            Trajanje: %s min
            Tip časa: %s
            Cena: %s RSD
            %s

            UPLATA
            Ana Vučićević
            Račun: 265000000719689179
            Džona Kenedija 23, 11070 Novi Beograd
            %s

            Kod za otkazivanje: %s

            Napomena: Nedolazak na zakazani čas ili otkazivanje neposredno pre početka časa smatraće se održanim terminom.

            Hvala vam na poverenju!

            Srdačno,
            Ana Vučićević
            """.formatted(
            safe(b.studentName),
            b.startTime.format(formatter),
            b.endTime.format(formatter),
            b.duration != null ? b.duration : 90,
            b.online ? "Online" : "Uživo - Novi Beograd",
            b.price,
            b.meetLink != null
                    ? "Google Meet: " + b.meetLink
                    : "Lokacija: Novi Beograd",
            b.online
                    ? ""
                    : "Ako uplata na navedeni način nije moguća, čas uživo možete platiti i prilikom dolaska.",
            safe(b.cancellationCode)
    );
}

    private String buildOwnerCancellationText(Booking b) {
        return """
                Termin je otkazan.

                Učenik: %s
                Termin: %s - %s
                Tip: %s
                Kod za otkazivanje: %s
                """.formatted(
                safe(b.studentName),
                b.startTime.format(formatter),
                b.endTime.format(formatter),
                b.online ? "Online" : "Uživo - Novi Beograd",
                safe(b.cancellationCode)
        );
    }

    private String buildStudentCancellationText(Booking b, boolean lateCancellation) {

    String cancellationNotice = lateCancellation
            ? """
              
              Napomena: Termin je otkazan manje od 4 sata pre početka časa.
              U skladu sa pravilima otkazivanja, čas će biti naplaćen kao održan.
              """
            : "";

    return """
            Zdravo %s,

            Vaš termin je uspešno otkazan.

            Otkazani termin:
            %s - %s
            %s
            Srdačno,
            Ana Vučićević
            """.formatted(
            safe(b.studentName),
            b.startTime.format(formatter),
            b.endTime.format(formatter),
            cancellationNotice
    );
}
  private void send(String to,String subject,String text){
    SimpleMailMessage m = new SimpleMailMessage();
    m.setFrom(ownerEmail);
    m.setTo(to);
    m.setSubject(subject);
    m.setText(text);
    sender.send(m);
}

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
