package io.github.francocarrera1.dailyenergy

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.LocalDate

class CyclesTest {

    private val birthday = Birthday(5, 23)

    @Test
    fun reduceCycleReadsTwoAsElevenAndKeepsMasters() {
        assertEquals("11", Cycles.reduceCycle(2).displayValue)
        assertEquals("11", Cycles.reduceCycle(20).displayValue)
        assertEquals("11", Cycles.reduceCycle(29).displayValue)
        assertEquals("11", Cycles.reduceCycle(11).displayValue)
        assertEquals("22", Cycles.reduceCycle(22).displayValue)
        assertEquals("33", Cycles.reduceCycle(33).displayValue)
        assertEquals("1", Cycles.reduceCycle(28).displayValue)
    }

    @Test
    fun universalYearFollowsCycleReduction() {
        assertEquals("1", Cycles.calculateUniversalYear(2026).displayValue)
        assertEquals(10, Cycles.calculateUniversalYear(2026).originalSum)
        assertEquals("11", Cycles.calculateUniversalYear(2027).displayValue)
        assertEquals("3", Cycles.calculateUniversalYear(2028).displayValue)
    }

    @Test
    fun universalMonthUsesUniversalYearAndCalendarMonth() {
        assertEquals(
            "11",
            Cycles.calculateUniversalMonth(LocalDate.of(2026, 10, 22)).displayValue
        )
        assertEquals(
            "3",
            Cycles.calculateUniversalMonth(LocalDate.of(2026, 11, 15)).displayValue
        )
        assertEquals(
            "4",
            Cycles.calculateUniversalMonth(LocalDate.of(2026, 12, 1)).displayValue
        )
        assertEquals(
            "3",
            Cycles.calculateUniversalMonth(LocalDate.of(2027, 1, 1)).displayValue
        )
        assertEquals(
            "22",
            Cycles.calculateUniversalMonth(LocalDate.of(2027, 11, 1)).displayValue
        )
    }

    @Test
    fun personalYearChangesOnTheBirthday() {
        val current = Cycles.calculatePersonalYear(
            LocalDate.of(2026, 10, 22),
            birthday
        )
        assertEquals("11", current.displayValue)
        assertEquals(LocalDate.of(2026, 5, 23), current.startDate)
        assertEquals(LocalDate.of(2027, 5, 23), current.endDate)

        val beforeBirthday = Cycles.calculatePersonalYear(
            LocalDate.of(2026, 1, 1),
            birthday
        )
        assertEquals("1", beforeBirthday.displayValue)
        assertEquals(LocalDate.of(2025, 5, 23), beforeBirthday.startDate)

        val nextYear = Cycles.calculatePersonalYear(
            LocalDate.of(2027, 5, 23),
            birthday
        )
        assertEquals("3", nextYear.displayValue)
        assertEquals(LocalDate.of(2027, 5, 23), nextYear.startDate)
    }

    @Test
    fun personalMonthUsesTheMonthTheBirthdayCycleStartsIn() {
        val current = Cycles.calculatePersonalMonth(
            LocalDate.of(2026, 10, 22),
            birthday
        )
        assertEquals("11", current.displayValue)
        assertEquals(LocalDate.of(2026, 9, 23), current.startDate)
        assertEquals(LocalDate.of(2026, 10, 23), current.endDate)

        val nextCycle = Cycles.calculatePersonalMonth(
            LocalDate.of(2026, 10, 23),
            birthday
        )
        assertEquals("3", nextCycle.displayValue)
        assertEquals(LocalDate.of(2026, 10, 23), nextCycle.startDate)
        assertEquals(LocalDate.of(2026, 11, 23), nextCycle.endDate)

        assertEquals(
            "22",
            Cycles.calculatePersonalMonth(LocalDate.of(2026, 11, 23), birthday)
                .displayValue
        )
        assertEquals(
            "1",
            Cycles.calculatePersonalMonth(LocalDate.of(2026, 9, 22), birthday)
                .displayValue
        )
    }

    @Test
    fun cyclesReturnNullPersonalValuesWithoutABirthday() {
        val cycles = Cycles.calculateCycleEnergies(
            LocalDate.of(2026, 10, 22),
            null
        )
        assertEquals("11", cycles.universalMonth.displayValue)
        assertNull(cycles.personalYear)
        assertNull(cycles.personalMonth)

        val full = Cycles.calculateCycleEnergies(
            LocalDate.of(2026, 10, 22),
            birthday
        )
        assertEquals("1", full.universalYear.displayValue)
        assertEquals("11", full.universalMonth.displayValue)
        assertEquals("11", full.personalYear?.displayValue)
        assertEquals("11", full.personalMonth?.displayValue)
    }

    @Test
    fun parsesFullAndMonthDayBirthdays() {
        assertEquals(Birthday(5, 23), Cycles.parseBirthday("05-23"))
        assertEquals(Birthday(5, 23), Cycles.parseBirthday("1990-05-23"))
    }
}
