package io.github.francocarrera1.dailyenergy

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.LocalDate

class CalendarMonthTest {

    private fun date(value: String): LocalDate = LocalDate.parse(value)

    @Test
    fun `october 2026 starts on thursday and has five weeks`() {
        val month = CalendarMonthBuilder.build(date("2026-10-22"))

        assertEquals("October 2026", month.label)
        assertEquals(5, month.weeks.size)
        assertEquals(31, month.days.size)
        assertEquals(31, month.weeks.flatten().count { it.date != null })
        assertEquals(7, month.weeks.first().size)

        // Sunday-first: four leading blanks, then October 1.
        assertNull(month.weeks.first()[0].date)
        assertNull(month.weeks.first()[1].date)
        assertNull(month.weeks.first()[2].date)
        assertNull(month.weeks.first()[3].date)
        assertEquals(LocalDate.of(2026, 10, 1), month.weeks.first()[4].date)
    }

    @Test
    fun `february 2026 starts on sunday and has four weeks`() {
        val month = CalendarMonthBuilder.build(date("2026-02-15"))

        assertEquals(LocalDate.of(2026, 2, 1), month.weeks.first()[0].date)
        assertEquals(4, month.weeks.size)
        assertEquals(28, month.days.size)
    }

    @Test
    fun `august 2026 needs six weeks`() {
        val month = CalendarMonthBuilder.build(date("2026-08-15"))

        assertEquals(6, month.weeks.size)
        assertEquals(1, month.weeks.first().count { it.date != null })
    }

    @Test
    fun `leap february includes the 29th`() {
        val month = CalendarMonthBuilder.build(date("2024-02-10"))

        assertEquals(29, month.days.size)
        assertEquals(29, month.weeks.flatten().count { it.date != null })
    }

    @Test
    fun `calendar uses the same daily energy as the widget`() {
        val month = CalendarMonthBuilder.build(date("2026-10-22"))
        val day = month.weeks.flatten().first { it.date == LocalDate.of(2026, 10, 22) }

        assertEquals("6/33", day.energies?.fullDateEnergy?.displayValue)
        assertEquals("22", day.energies?.secondaryEnergy?.displayValue)
    }
}
