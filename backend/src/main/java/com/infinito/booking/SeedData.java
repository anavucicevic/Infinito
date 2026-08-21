package com.infinito.booking;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Configuration
public class SeedData {

    @Bean
    CommandLineRunner seed(LessonSlotRepository repo) {
        return args -> {

            LocalDate today = LocalDate.now();
            LocalDate lastDay = today.plusDays(21);
            LocalDateTime now = LocalDateTime.now();

            List<LessonSlot> newSlots = new ArrayList<>();

            Set<LocalDateTime> existingStartTimes = new HashSet<>();

            repo.findAll().forEach(slot ->
                    existingStartTimes.add(slot.startTime)
            );

            LocalDate date = today;

            while (!date.isAfter(lastDay)) {

                DayOfWeek day = date.getDayOfWeek();

                switch (day) {

                    case MONDAY, WEDNESDAY, FRIDAY ->
                            addDay(
                                    newSlots,
                                    date,
                                    true,
                                    false,
                                    existingStartTimes,
                                    now
                            );

                    case TUESDAY, THURSDAY ->
                            addDay(
                                    newSlots,
                                    date,
                                    false,
                                    false,
                                    existingStartTimes,
                                    now
                            );

                    case SATURDAY ->
                            addDay(
                                    newSlots,
                                    date,
                                    false,
                                    true,
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
        };
    }

    static void addDay(
            List<LessonSlot> out,
            LocalDate date,
            boolean online,
            boolean saturdayShort,
            Set<LocalDateTime> existingStartTimes,
            LocalDateTime now
    ) {

        int[][] times = {
                {10, 0, 11, 30},
                {11, 45, 13, 15},
                {13, 30, 15, 0},
                {15, 15, 16, 45},
                {17, 0, 18, 30},
                {18, 45, 20, 15}
        };

        for (int i = 0; i < times.length; i++) {

            // Subotom postoje samo poslednja dva termina.
            if (saturdayShort && i < 4) {
                continue;
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
