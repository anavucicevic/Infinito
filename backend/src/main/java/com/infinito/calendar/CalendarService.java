package com.infinito.calendar;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.ConferenceData;
import com.google.api.services.calendar.model.ConferenceSolutionKey;
import com.google.api.services.calendar.model.CreateConferenceRequest;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import com.infinito.booking.Booking;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import java.io.ByteArrayInputStream;
import java.util.Base64;
import java.io.InputStream;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@Service
public class CalendarService {

    @Value("${app.calendar.enabled:false}")
    private boolean enabled;

    @Value("${google.calendar.id}")
    private String calendarId;

    @Value("${google.service.account.path}")
    private String serviceAccountPath;
    
    @Value("${app.meet.link:}")
    private String defaultMeetLink;

    private final ZoneId belgradeZone = ZoneId.of("Europe/Belgrade");

    public CalendarResult createEvent(Booking b) {
        if (!enabled) {
            String meet = b.online ? "Google Meet link će se generisati kada se uključi Calendar API" : null;
            return new CalendarResult("local-" + UUID.randomUUID(), meet);
        }

        try {
            Calendar service = buildCalendarService();

            Event event = new Event()
                    .setSummary("Čas matematike - " + safe(b.studentName))
                    .setLocation(b.online ? "Online - Google Meet" : "Novi Beograd")
                    .setDescription(buildDescription(b))
                    .setStart(new EventDateTime()
                            .setDateTime(toGoogleDateTime(b.startTime))
                            .setTimeZone("Europe/Belgrade"))
                    .setEnd(new EventDateTime()
                            .setDateTime(toGoogleDateTime(b.endTime))
                            .setTimeZone("Europe/Belgrade"));

           /* if (b.online) {
                ConferenceData conferenceData = new ConferenceData()
                        .setCreateRequest(new CreateConferenceRequest()
                                .setRequestId("infinito-" + UUID.randomUUID())
                                .setConferenceSolutionKey(new ConferenceSolutionKey()
                                        .setType("hangoutsMeet")));

                event.setConferenceData(conferenceData);
            }*/

            Event created = service.events()
                    .insert(calendarId, event)
.setConferenceDataVersion(0)
                    .execute();

String meetLink = b.online ? defaultMeetLink : null;

            return new CalendarResult(created.getId(), meetLink);

        } catch (Exception e) {
            throw new RuntimeException("Greška pri kreiranju Google Calendar događaja: " + e.getMessage(), e);
        }
    }
    public void deleteEvent(String eventId) {
    if (!enabled || eventId == null || eventId.isBlank()) {
        return;
    }

    try {
        Calendar service = buildCalendarService();

        service.events()
                .delete(calendarId, eventId)
                .execute();

    } catch (Exception e) {
        throw new RuntimeException(
                "Greška pri brisanju Google Calendar događaja: "
                        + e.getMessage(),
                e
        );
    }
}

    private Calendar buildCalendarService() throws Exception {
        String encodedCredentials = System.getenv("GOOGLE_SERVICE_ACCOUNT_BASE64");

InputStream credentialsStream;

if (encodedCredentials != null && !encodedCredentials.isBlank()) {
    byte[] decoded = Base64.getDecoder().decode(encodedCredentials);
    credentialsStream = new ByteArrayInputStream(decoded);
} else {
    credentialsStream = new ClassPathResource(serviceAccountPath).getInputStream();
}

        GoogleCredentials credentials = GoogleCredentials
                .fromStream(credentialsStream)
                .createScoped(List.of("https://www.googleapis.com/auth/calendar"));

        HttpRequestInitializer requestInitializer = new HttpCredentialsAdapter(credentials);

        return new Calendar.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                requestInitializer
        )
                .setApplicationName("Skola matematike Infinito")
                .build();
    }

    private DateTime toGoogleDateTime(java.time.LocalDateTime time) {
        return new DateTime(time.atZone(belgradeZone).toInstant().toEpochMilli());
    }

    private String buildDescription(Booking b) {
        return """
                Rezervacija časa matematike

                Učenik: %s
                Nivo: %s
                Oblast/opis: %s
                Cena: %s RSD
                Tip časa: %s
                Kod za otkazivanje: %s
                """.formatted(
                safe(b.studentName),
                safe(b.level),
                safe(b.topic),
                b.price,
                b.online ? "online" : "uživo",
                safe(b.cancellationCode)
        );
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    public record CalendarResult(String eventId, String meetLink) {}
}
