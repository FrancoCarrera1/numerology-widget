package io.github.francocarrera1.dailyenergy

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * A Sunday-first month grid, mirroring generateMonthlyCalendar() in the
 * TypeScript core. Blank cells are null so every week has exactly seven slots.
 */
data class CalendarDay(
    val date: LocalDate?,
    val dayNumber: Int?,
    val energies: NumerologyEnergies?
)

data class CalendarMonth(
    val year: Int,
    val month: Int,
    val label: String,
    val weeks: List<List<CalendarDay>>,
    val days: List<CalendarDay>
)

object CalendarMonthBuilder {

    private val MONTH_FORMAT = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.US)

    fun build(date: LocalDate): CalendarMonth {
        val first = date.withDayOfMonth(1)
        val cells = mutableListOf<CalendarDay>()

        // java.time: Monday = 1 ... Sunday = 7. Sunday-first needs Sunday = 0.
        val leadingBlanks = first.dayOfWeek.value % 7
        repeat(leadingBlanks) {
            cells.add(CalendarDay(null, null, null))
        }

        val days = (1..first.lengthOfMonth()).map { day ->
            val current = first.withDayOfMonth(day)
            CalendarDay(
                date = current,
                dayNumber = day,
                energies = Numerology.calculate(current)
            )
        }
        cells.addAll(days)

        while (cells.size % 7 != 0) {
            cells.add(CalendarDay(null, null, null))
        }

        return CalendarMonth(
            year = first.year,
            month = first.monthValue,
            label = first.format(MONTH_FORMAT),
            weeks = cells.chunked(7),
            days = days
        )
    }
}
