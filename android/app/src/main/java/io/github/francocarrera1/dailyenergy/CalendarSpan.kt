package io.github.francocarrera1.dailyenergy

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * A rolling span of consecutive days, five by default.
 *
 * The calendar widget shows five days starting at an anchor date (today unless
 * the user paged away), which leaves each column wide enough for a legible
 * weekday, date, and both energies on a phone-width card.
 */
data class CalendarDay(
    val date: LocalDate?,
    val dayNumber: Int?,
    val energies: NumerologyEnergies?
)

data class CalendarSpan(
    val start: LocalDate,
    val end: LocalDate,
    val label: String,
    val days: List<CalendarDay>
)

object CalendarSpanBuilder {

    const val LENGTH = 5

    private val SHORT = DateTimeFormatter.ofPattern("MMM d", Locale.US)
    private val SPOKEN = DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.US)

    fun build(start: LocalDate, length: Int = LENGTH): CalendarSpan {
        val days = (0 until length).map { offset ->
            val current = start.plusDays(offset.toLong())
            CalendarDay(
                date = current,
                dayNumber = current.dayOfMonth,
                energies = Numerology.calculate(current)
            )
        }
        val end = start.plusDays((length - 1).toLong())

        return CalendarSpan(
            start = start,
            end = end,
            label = label(start, end),
            days = days
        )
    }

    /** Compact header label: "Oct 22 – 26", or "Oct 29 – Nov 2" across months. */
    fun label(start: LocalDate, end: LocalDate): String = when {
        start.month == end.month -> "${start.format(SHORT)} – ${end.dayOfMonth}"
        else -> "${start.format(SHORT)} – ${end.format(SHORT)}"
    }

    /** Spoken label for accessibility: "Five days from October 22, 2026". */
    fun spokenLabel(start: LocalDate): String = "Five days from ${start.format(SPOKEN)}"
}
