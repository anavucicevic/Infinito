package com.infinito.booking;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Configuration
public class SeedData {

    private static final ZoneId BELGRADE_ZONE =
            ZoneId.of("Europe/Belgrade");

    // Od ovog datuma počinje novi raspored časova.
    private static final LocalDate NEW_SCHEDULE_START =
            LocalDate.of(2026, 10, 19);

    private final LessonSlotRepository repo;

    public SeedData(LessonSlotRepository repo) {
        this.repo = repo;
    }

    // Pri pokretanju backenda prvo proveravamo prelazak
    // na novi raspored, a zatim generišemo termine.
    @Bean
    CommandLineRunner seed() {
        return args -> {
            migrateToNewSchedule();
            generateSlots();
        };
    }

    // Svakog dana u 00:05 dopunjava termine
    // tako da uvek postoje termini 21 dan unapred.
    @Scheduled(cron = "0 5 0 * * *", zone = "Europe/Belgrade")
    public void scheduledSeed() {
        generateSlots();
    }

    private void migrateToNewSchedule() {

        List<LessonSlot> oldSlotsToDelete = repo.findAll()
                .stream()
                .filter(slot -> slot.startTime != null)
                .filter(slot ->
                        !slot.startTime.toLocalDate()
                                .isBefore(NEW_SCHEDULE_START)
                )
                .filter(slot -> !slot.booked)
                .filter(slot -> isOldScheduleTime(slot.startTime))
                .toList();

        if (oldSlotsToDelete.isEmpty()) {
            return;
        }

        repo.deleteAll(oldSlotsToDelete);

        System.out.println(
                "Uklonjeno starih termina od 19.10.2026: "
                        + oldSlotsToDelete.size()
        );
    }

    private boolean isOldScheduleTime(LocalDateTime startTime) {

        int hour = startTime.getHour();
        int minute = startTime.getMinute();

        return (hour == 10 && minute == 0)
                || (hour == 11 && minute == 45)
                || (hour == 13 && minute == 30)
                || (hour == 15 && minute == 15)
                || (hour == 17 && minute == 0)
                || (hour == 18 && minute == 45);
    }

    private void generateSlots() {

        LocalDate today = LocalDate.now(BELGRADE_ZONE);
        LocalDate lastDay = today.plusDays(21);
        LocalDateTime now = LocalDateTime.now(BELGRADE_ZONE);

        List<LessonSlot> newSlots = new ArrayList<>();
        Set<LocalDateTime> existingStartTimes = new HashSet<>();

        repo.findAll().forEach(slot ->
                existingStartTimes.add(slot.startTime)
        );

        LocalDate date = today;

        while (!date.isAfter(lastDay)) {

            DayOfWeek day = date.getDayOfWeek();

            boolean newSchedule =
                    !date.isBefore(NEW_SCHEDULE_START);

            switch (day) {

                case MONDAY, WEDNESDAY, FRIDAY ->
                        addDay(
                                newSlots,
                                date,
                                true,
                                false,
                                newSchedule,
                                existingStartTimes,
                                now
                        );

                case TUESDAY, THURSDAY ->
                        addDay(
                                newSlots,
                                date,
                                false,
                                false,
                                newSchedule,
                                existingStartTimes,
                                now
                        );

                case SATURDAY ->
                        addDay(
                                newSlots,
                                date,
                                false,
                                true,
                                newSchedule,
                                existingStartTimes,
                                now
                        );

                default -> {
                    // Nedeljom nema časova.
                }
            }

            date = date.plusDays(1);
        }

        repo.saveAll(newSlots);

        System.out.println(
                "Generisano novih termina: " + newSlots.size()
        );
    }

    static void addDay(
            List<LessonSlot> out,
            LocalDate date,
            boolean online,
            boolean saturdayShort,
            boolean newSchedule,
            Set<LocalDateTime> existingStartTimes,
            LocalDateTime now
    ) {

        int[][] oldTimes = {
                {10, 0, 11, 30},
                {11, 45, 13, 15},
                {13, 30, 15, 0},
                {15, 15, 16, 45},
                {17, 0, 18, 30},
                {18, 45, 20, 15}
        };

        int[][] newTimes = {
                {9, 30, 11, 0},
                {11, 15, 12, 45},
                {13, 0, 14, 30},
                {14, 45, 16, 15},
                {16, 30, 18, 0},
                {18, 15, 19, 45},
                {20, 0, 21, 30}
        };

        int[][] times = newSchedule
                ? newTimes
                : oldTimes;

        for (int i = 0; i < times.length; i++) {

            if (saturdayShort) {

                // Do 18.10.2026. subotom postoje poslednja dva
                // termina starog rasporeda.
                if (!newSchedule && i < 4) {
                    continue;
                }

                // Od 19.10.2026. subotom postoje poslednja tri
                // termina novog rasporeda.
                if (newSchedule && i < 4) {
                    continue;
                }
            }

            LocalDateTime start = date.atTime(
                    times[i][0],
                    times[i][1]
            );

            LocalDateTime end = date.atTime(
                    times[i][2],
                    times[i][3]
            );

            // Ne generišemo termine koji su već prošli.
            if (!start.isAfter(now)) {
                continue;
            }

            // Ne pravimo duplikate.
            if (existingStartTimes.contains(start)) {
                continue;
            }

            out.add(
                    new LessonSlot(
                            start,
                            end,
                            online,
                            false,
                            null
                    )
            );

            existingStartTimes.add(start);
        }
    }
}
