package io.github.francocarrera1.dailyenergy

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import java.time.LocalDate

class CalendarSpanTest {

    private fun date(value: String): LocalDate = LocalDate.parse(value)

    @Test
    fun `span starts at the anchor day and covers five days`() {
        val span = CalendarSpanBuilder.build(date("2026-10-22"))

        assertEquals(LocalDate.of(2026, 10, 22), span.start)
        assertEquals(LocalDate.of(2026, 10, 26), span.end)
        assertEquals("Oct 22 – 26", span.label)
        assertEquals(5, span.days.size)
        assertEquals((22..26).toList(), span.days.map { it.dayNumber })
    }

    @Test
    fun `span rolls across a month boundary`() {
        val span = CalendarSpanBuilder.build(date("2026-10-30"))

        assertEquals(listOf(30, 31, 1, 2, 3), span.days.map { it.dayNumber })
        assertEquals(LocalDate.of(2026, 11, 3), span.end)
        assertEquals("Oct 30 – Nov 3", span.label)
    }

    @Test
    fun `span rolls across the new year`() {
        val span = CalendarSpanBuilder.build(date("2026-12-30"))

        assertEquals(LocalDate.of(2027, 1, 3), span.end)
        assertEquals("Dec 30 – Jan 3", span.label)
        assertEquals("Five days from December 30, 2026", CalendarSpanBuilder.spokenLabel(span.start))
    }

    @Test
    fun `paging by five days moves the window exactly one span`() {
        val span = CalendarSpanBuilder.build(date("2026-10-22"))
        val next = CalendarSpanBuilder.build(span.start.plusDays(CalendarSpanBuilder.LENGTH.toLong()))
        val previous = CalendarSpanBuilder.build(span.start.minusDays(CalendarSpanBuilder.LENGTH.toLong()))

        assertEquals(LocalDate.of(2026, 10, 27), next.start)
        assertEquals(LocalDate.of(2026, 10, 17), previous.start)
        assertEquals("Oct 27 – 31", next.label)
        assertEquals("Oct 17 – 21", previous.label)
    }

    @Test
    fun `every day in the span has energies`() {
        val span = CalendarSpanBuilder.build(date("2026-10-22"))

        span.days.forEach { day ->
            assertNotNull(day.date)
            assertNotNull(day.energies)
            assertEquals(day.date!!.dayOfMonth, day.dayNumber)
        }
    }

    @Test
    fun `length is configurable for other surfaces`() {
        val span = CalendarSpanBuilder.build(date("2026-10-22"), length = 7)

        assertEquals(7, span.days.size)
        assertEquals(LocalDate.of(2026, 10, 28), span.end)
    }
}
