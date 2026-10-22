package io.github.francocarrera1.dailyenergy

import java.time.LocalDate

/**
 * Life Path calculated from the whole birth date.
 *
 * Kotlin port of calculateLifePath in src/numerology-core.ts. Keep both in
 * sync. The Life Path is the primary birth number; the birth-day Secondary
 * Energy remains a separate daily signal.
 */
data class LifePathResult(
    val birthday: LocalDate,
    val month: Int,
    val day: Int,
    val year: Int,
    val monthValue: Int,
    val dayValue: Int,
    val yearValue: Int,
    val total: Int,
    val reducedNumber: Int,
    val displayValue: String,
    val underlyingNumber: Int?,
    val isMaster: Boolean,
    val isWealth: Boolean,
    val summary: String,
    val calculationNote: String
)

object LifePath {

    private val MASTER_NUMBERS = setOf(11, 22, 33)

    private val SUMMARIES = mapOf(
        1 to "Initiator and leader",
        3 to "Creative communicator",
        4 to "Builder and foundation",
        5 to "Explorer and freedom seeker",
        6 to "Protector and nurturer",
        7 to "Seeker and analyst",
        8 to "Achiever and abundance",
        9 to "Humanitarian and completion",
        11 to "Intuitive teacher",
        22 to "Master builder",
        33 to "Master teacher",
        28 to "Wealth Life Path · 1 underneath"
    )

    private fun reduceComponent(value: Int): Int {
        var number = value
        while (number > 9 && number !in MASTER_NUMBERS) {
            number = Numerology.sumDigits(number)
        }
        return number
    }

    fun calculate(date: LocalDate): LifePathResult {
        val monthValue = reduceComponent(date.monthValue)
        val dayValue = reduceComponent(date.dayOfMonth)
        // The year is summed once and kept as a two-digit component.
        val yearValue = Numerology.sumDigits(date.year)
        val total = monthValue + dayValue + yearValue

        val reducedNumber: Int
        val underlyingNumber: Int?
        val reductionNote: String

        if (total == 28) {
            reducedNumber = 28
            underlyingNumber = 1
            reductionNote = "28 is the Wealth Life Path; 1 underneath"
        } else {
            val steps = mutableListOf(total)
            var number = total
            while (number > 9 && number !in MASTER_NUMBERS) {
                number = Numerology.sumDigits(number)
                steps.add(number)
            }
            if (number == 2) {
                number = 11
                steps.add(11)
            }
            reducedNumber = number
            underlyingNumber = when (number) {
                11 -> 2
                22 -> 4
                33 -> 6
                else -> null
            }
            val cameFromTwo = number == 11 && steps.size >= 2 && steps[steps.size - 2] == 2
            reductionNote = when {
                steps.size > 1 ->
                    steps.joinToString(" → ") + if (cameFromTwo) "; 2 reads as 11" else ""
                number in MASTER_NUMBERS ->
                    "$number is a master number and stays whole" +
                        (underlyingNumber?.let { "; $it underneath" } ?: "")
                else -> number.toString()
            }
        }

        val calculationNote =
            "Month ${date.monthValue} → $monthValue · " +
                "Day ${date.dayOfMonth} → $dayValue · " +
                "Year ${date.year} digits = $yearValue. " +
                "$monthValue + $dayValue + $yearValue = $total; $reductionNote"

        return LifePathResult(
            birthday = date,
            month = date.monthValue,
            day = date.dayOfMonth,
            year = date.year,
            monthValue = monthValue,
            dayValue = dayValue,
            yearValue = yearValue,
            total = total,
            reducedNumber = reducedNumber,
            displayValue = reducedNumber.toString(),
            underlyingNumber = underlyingNumber,
            isMaster = reducedNumber in MASTER_NUMBERS,
            isWealth = reducedNumber == 28,
            summary = SUMMARIES[reducedNumber] ?: "Life Path",
            calculationNote = calculationNote
        )
    }
}
