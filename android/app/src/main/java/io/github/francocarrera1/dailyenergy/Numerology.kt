package io.github.francocarrera1.dailyenergy

import java.time.LocalDate
import kotlin.math.max
import kotlin.math.min

/**
 * Numerology calculation engine.
 *
 * Kotlin port of the TypeScript engine in src/numerology-core.ts. Both implement
 * the GG33 / matrixprime rules. Keep the two implementations in sync.
 */

data class FullDateEnergy(
    val originalSum: Int,
    val reducedNumber: Int,
    val displayValue: String,
    val calculationNote: String,
    val summary: String
)

data class SecondaryEnergy(
    val originalDay: Int,
    val reducedNumber: Int,
    val displayValue: String,
    val note: String? = null
)

data class NumerologyEnergies(
    val date: LocalDate,
    val fullDateEnergy: FullDateEnergy,
    val secondaryEnergy: SecondaryEnergy
) {
    val combinedKey: String
        get() = "${fullDateEnergy.displayValue} + ${secondaryEnergy.displayValue}"
}

object Numerology {

    private val MASTER_NUMBERS = setOf(11, 22, 33)

    fun sumDigits(number: Int): Int = number.toString().sumOf { it.digitToInt() }

    /**
     * Reduce to a single digit unless the result is a master number.
     * 28 is intentionally NOT special here: day 28 reduces to 1.
     */
    fun reduceToSingleDigit(input: Int): Int {
        var number = input

        if (number in MASTER_NUMBERS) {
            return number
        }

        while (number > 9) {
            number = sumDigits(number)
            if (number in MASTER_NUMBERS) {
                break
            }
        }

        return number
    }

    fun calculateFullDateEnergy(date: LocalDate): FullDateEnergy {
        val month = date.monthValue
        val day = date.dayOfMonth
        val yearDigits = date.year.toString().map { it.digitToInt() }
        val yearSum = yearDigits.sum()
        val yearExpression = yearDigits.joinToString("+")

        // Method 1: break down non-masters, keep master numbers whole.
        val method1MonthValue = if (month in MASTER_NUMBERS) month else sumDigits(month)
        val method1DayValue = if (day in MASTER_NUMBERS) day else sumDigits(day)
        val method1Sum = method1MonthValue + method1DayValue + yearSum

        val method1Reduced: Int = when {
            method1Sum == 28 -> 28
            method1Sum in MASTER_NUMBERS -> method1Sum
            method1Sum <= 9 -> method1Sum
            else -> reduceToSingleDigit(method1Sum)
        }
        val finalMethod1 = if (method1Reduced == 2) 11 else method1Reduced

        // Method 2: keep month and day whole, always sum the year digits.
        val method2Sum = month + day + yearSum

        // Special case: 20 = 20/2 but numerologically means 11.
        if (method2Sum == 20) {
            return FullDateEnergy(
                originalSum = method2Sum,
                reducedNumber = 11,
                displayValue = "20/2",
                calculationNote = "$month + $day + $yearExpression = $method2Sum " +
                    "(special: 20 = 11 numerologically)",
                summary = "20 reduces to 11"
            )
        }

        // Both methods agree before any reduction of method 2.
        if (method2Sum == finalMethod1) {
            var displayResult = method2Sum

            if (method2Sum % 10 == 0 && method2Sum != 20) {
                displayResult = method2Sum / 10
            } else if (method2Sum > 9 && method2Sum !in MASTER_NUMBERS && method2Sum != 28) {
                val reduced = reduceToSingleDigit(method2Sum)
                if (reduced in MASTER_NUMBERS) {
                    displayResult = reduced
                }
            }

            return FullDateEnergy(
                originalSum = method2Sum,
                reducedNumber = displayResult,
                displayValue = displayResult.toString(),
                calculationNote = "Both methods agree: " +
                    "$method1MonthValue+$method1DayValue+$yearSum = $method1Sum" +
                    if (displayResult != method2Sum) " ($method2Sum→$displayResult)" else "",
                summary = "Both methods agree"
            )
        }

        // Reduce method 2 for comparison and display.
        var method2Display = method2Sum
        if (method2Sum % 10 == 0 && method2Sum != 20) {
            method2Display = method2Sum / 10
        } else if (method2Sum > 9 && method2Sum !in MASTER_NUMBERS && method2Sum != 28) {
            method2Display = reduceToSingleDigit(method2Sum)
        }

        if (method2Display == finalMethod1) {
            return FullDateEnergy(
                originalSum = method2Sum,
                reducedNumber = finalMethod1,
                displayValue = finalMethod1.toString(),
                calculationNote = "Both methods agree after reduction: $method2Sum → $method2Display",
                summary = "Both methods agree"
            )
        }

        val smaller = min(method2Display, finalMethod1)
        val larger = max(method2Display, finalMethod1)

        return FullDateEnergy(
            originalSum = method2Sum,
            reducedNumber = finalMethod1,
            displayValue = "$smaller/$larger",
            calculationNote = "Method 1: $method1MonthValue+$method1DayValue+$yearSum = " +
                "$method1Sum → $finalMethod1; Method 2: $month+$day+$yearSum = " +
                "$method2Sum → $method2Display",
            summary = "Method 1: $finalMethod1\nMethod 2: $method2Display"
        )
    }

    fun calculateSecondaryEnergy(date: LocalDate): SecondaryEnergy {
        val day = date.dayOfMonth

        if (day == 2) {
            return SecondaryEnergy(day, 11, "11", "Day 2nd = 11 energy")
        }

        if (day == 20) {
            return SecondaryEnergy(day, 11, "20/2", "Day 20th = 20/2 (numerologically 11)")
        }

        if (day in MASTER_NUMBERS) {
            return SecondaryEnergy(day, day, day.toString(), "Master number day")
        }

        val reduced = reduceToSingleDigit(day)
        return SecondaryEnergy(day, reduced, reduced.toString())
    }

    fun calculate(date: LocalDate): NumerologyEnergies {
        return NumerologyEnergies(
            date = date,
            fullDateEnergy = calculateFullDateEnergy(date),
            secondaryEnergy = calculateSecondaryEnergy(date)
        )
    }
}
