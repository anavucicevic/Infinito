package com.infinito.booking;

import jakarta.persistence.*;
import java.time.*;

@Entity
public class Booking {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    public String studentName;
    public String email;
    public String phone;
    public String level;

    @Column(length = 1000)
    public String topic;

    public Integer price;
    public boolean online;

    public LocalDateTime startTime;
    public LocalDateTime endTime;

    public String meetLink;
    public String calendarEventId;

    public String cancellationCode;
    public boolean cancelled;
}
