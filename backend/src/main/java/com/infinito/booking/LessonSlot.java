package com.infinito.booking;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class LessonSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    public LocalDateTime startTime;
    public LocalDateTime endTime;

    public boolean online;
    public boolean booked;

    @Column(nullable = true)
public Boolean blocked = false;
    public String reservedBy;
    public Integer price;

    public LessonSlot() {
    }

    public LessonSlot(
            LocalDateTime startTime,
            LocalDateTime endTime,
            boolean online,
            boolean booked,
            String reservedBy
    ) {
        this.startTime = startTime;
        this.endTime = endTime;
        this.online = online;
        this.booked = booked;
        this.blocked = false;
        this.reservedBy = reservedBy;
        this.price = 2000;
    }
}
