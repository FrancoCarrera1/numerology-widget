package io.github.francocarrera1.dailyenergy

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.LocalDate

class NumerologyTest {

    private fun date(value: String): LocalDate = LocalDate.parse(value)

    @Test
    fun `full date fixtures match the web widget`() {
        val cases = listOf(
            "2025-11-08" to "28",
            "2025-11-12" to "5",
            "2025-12-07" to "1/28",
            "2025-11-11" to "4",
            "2025-09-15" to "6/33",
            "2025-09-22" to "4",
            "2025-02-09" to "20/2",
            "2026-10-28" to "3"
        )

        cases.forEach { (input, expected) ->
            assertEquals(
                "full date energy for $input",
                expected,
                Numerology.calculateFullDateEnergy(date(input)).displayValue
            )
        }
    }

    @Test
    fun `secondary energy fixtures match the web widget`() {
        val cases = listOf(
            "2025-11-08" to "8",
            "2025-11-12" to "3",
            "2025-12-07" to "7",
            "2025-11-11" to "11",
            "2025-09-15" to "6",
            "2025-09-22" to "22",
            "2025-02-09" to "9",
            "2026-10-28" to "1"
        )

        cases.forEach { (input, expected) ->
            assertEquals(
                "secondary energy for $input",
                expected,
                Numerology.calculateSecondaryEnergy(date(input)).displayValue
            )
        }
    }

    @Test
    fun `combined key joins both energies`() {
        val energies = Numerology.calculate(date("2025-11-08"))
        assertEquals("28", energies.fullDateEnergy.displayValue)
        assertEquals("8", energies.secondaryEnergy.displayValue)
        assertEquals("28 + 8", energies.combinedKey)
    }

    @Test
    fun `reduceToSingleDigit keeps master numbers`() {
        assertEquals(11, Numerology.reduceToSingleDigit(11))
        assertEquals(22, Numerology.reduceToSingleDigit(22))
        assertEquals(33, Numerology.reduceToSingleDigit(33))
        assertEquals(11, Numerology.reduceToSingleDigit(29))
        assertEquals(11, Numerology.reduceToSingleDigit(38))
        assertEquals(22, Numerology.reduceToSingleDigit(499))
    }

    @Test
    fun `day 28 is not a master day`() {
        assertEquals(1, Numerology.reduceToSingleDigit(28))
        assertEquals("1", Numerology.calculateSecondaryEnergy(date("2026-10-28")).displayValue)
    }

    @Test
    fun `twenty reduces to eleven`() {
        val full = Numerology.calculateFullDateEnergy(date("2025-02-09"))
        assertEquals("20/2", full.displayValue)
        assertEquals(11, full.reducedNumber)
        assertEquals(20, full.originalSum)

        val secondary = Numerology.calculateSecondaryEnergy(date("2026-10-20"))
        assertEquals("20/2", secondary.displayValue)
        assertEquals(11, secondary.reducedNumber)
    }

    @Test
    fun `day two is eleven energy`() {
        assertEquals("11", Numerology.calculateSecondaryEnergy(date("2026-10-02")).displayValue)
    }

    @Test
    fun `twenty-eight stays whole for full date energy`() {
        val result = Numerology.calculateFullDateEnergy(date("2025-11-08"))
        assertEquals("28", result.displayValue)
        assertEquals(28, result.reducedNumber)
    }

    @Test
    fun `regular secondary days reduce`() {
        assertNull(Numerology.calculateSecondaryEnergy(date("2026-10-15")).note)
        assertEquals("6", Numerology.calculateSecondaryEnergy(date("2026-10-15")).displayValue)
        assertEquals("4", Numerology.calculateSecondaryEnergy(date("2026-10-31")).displayValue)
    }

    @Test
    fun `life path fixtures match the web widget`() {
        val cases = listOf(
            "2003-05-23" to "6",
            "1963-02-17" to "11",
            "1847-02-11" to "33",
            "1935-02-08" to "28"
        )

        cases.forEach { (input, expected) ->
            assertEquals(
                "life path for $input",
                expected,
                LifePath.calculate(date(input)).displayValue
            )
        }
    }

    @Test
    fun `life path keeps year digit sums whole`() {
        val result = LifePath.calculate(date("1963-02-17"))
        assertEquals(2, result.monthValue)
        assertEquals(8, result.dayValue)
        assertEquals(19, result.yearValue)
        assertEquals(29, result.total)
        assertEquals(11, result.reducedNumber)
        assertEquals(true, result.isMaster)
    }

    @Test
    fun `life path keeps master month and day components`() {
        val result = LifePath.calculate(date("2003-11-22"))
        assertEquals(11, result.monthValue)
        assertEquals(22, result.dayValue)
        assertEquals(5, result.yearValue)
        assertEquals(38, result.total)
        assertEquals("11", result.displayValue)
    }

    @Test
    fun `life path keeps thirty three with a six underneath`() {
        val result = LifePath.calculate(date("1847-02-11"))
        assertEquals(33, result.reducedNumber)
        assertEquals(6, result.underlyingNumber ?: 0)
        assertEquals(true, result.isMaster)
        assertEquals("33", result.displayValue)
    }

    @Test
    fun `life path reads twenty as eleven`() {
        val result = LifePath.calculate(date("2000-11-07"))
        assertEquals(20, result.total)
        assertEquals(11, result.reducedNumber)
        assertEquals("11", result.displayValue)
    }

    @Test
    fun `life path keeps an exact twenty eight as wealth`() {
        val result = LifePath.calculate(date("1935-02-08"))
        assertEquals(28, result.total)
        assertEquals(28, result.reducedNumber)
        assertEquals("28", result.displayValue)
        assertEquals(1, result.underlyingNumber ?: 0)
        assertEquals(true, result.isWealth)
        assertEquals(false, result.isMaster)
    }
}
