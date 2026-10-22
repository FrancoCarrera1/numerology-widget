package io.github.francocarrera1.dailyenergy

import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.abs
import kotlin.math.min

/**
 * Universal/Personal timing cycles.
 *
 * Mirrors calculateUniversalYear/Month and calculatePersonalYear/Month in
 * src/numerology-core.ts. House rules:
 * - 11, 22 and 33 stay whole.
 * - A final 2 reads as 11 (so 20 → 11).
 * - 28 is not special for these cycles.
 * - Personal cycles change on the birthday, not January 1 / the 1st.
 */

data class Birthday(val month: Int, val day: Int)

data class CycleReduction(
    val originalSum: Int,
    val reducedNumber: Int,
    val displayValue: String,
    val calculationNote: String
)

data class CycleResult(
    val originalSum: Int,
    val reducedNumber: Int,
    val displayValue: String,
    val calculationNote: String,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val dateLabel: String
)

data class CycleEnergies(
    val universalYear: CycleResult,
    val universalMonth: CycleResult,
    val personalYear: CycleResult?,
    val personalMonth: CycleResult?
)

object Cycles {

    private val MASTER_NUMBERS = setOf(11, 22, 33)
    private val MONTH_YEAR_FORMAT = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.US)
    private val SHORT_DATE = DateTimeFormatter.ofPattern("MMM d", Locale.US)
    private val FULL_DATE = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US)

    fun reduceCycle(input: Int): CycleReduction {
        val original = abs(input)
        var number = original

        while (number > 9 && number !in MASTER_NUMBERS) {
            number = Numerology.sumDigits(number)
        }

        if (number == 2) {
            return CycleReduction(
                originalSum = original,
                reducedNumber = 11,
                displayValue = "11",
                calculationNote = "$original → 2; timing cycles read 2 as 11"
            )
        }

        return CycleReduction(
            originalSum = original,
            reducedNumber = number,
            displayValue = number.toString(),
            calculationNote = if (number in MASTER_NUMBERS) {
                "$original; $number is a master number and stays whole"
            } else {
                "$original → $number"
            }
        )
    }

    fun parseBirthday(input: String): Birthday {
        val trimmed = input.trim()
        val birthday = if (Regex("^\\d{1,2}-\\d{1,2}$").matches(trimmed)) {
            val parts = trimmed.split("-")
            Birthday(parts[0].toInt(), parts[1].toInt())
        } else {
            val date = LocalDate.parse(trimmed)
            Birthday(date.monthValue, date.dayOfMonth)
        }

        require(birthday.month in 1..12) { "Birthday month must be between 1 and 12" }
        require(birthday.day in 1..31) { "Birthday day must be between 1 and 31" }

        // Validate against a leap year so 02-29 is allowed but 02-30 is not.
        require(birthday.day <= YearMonth.of(2000, birthday.month).lengthOfMonth()) {
            "Invalid birthday day for the selected month"
        }

        return birthday
    }

    fun calculateUniversalYear(year: Int): CycleResult {
        val sum = Numerology.sumDigits(year)
        val reduction = reduceCycle(sum)
        return CycleResult(
            originalSum = reduction.originalSum,
            reducedNumber = reduction.reducedNumber,
            displayValue = reduction.displayValue,
            calculationNote = reduction.calculationNote,
            startDate = LocalDate.of(year, 1, 1),
            endDate = LocalDate.of(year + 1, 1, 1),
            dateLabel = year.toString()
        )
    }

    fun calculateUniversalMonth(date: LocalDate): CycleResult {
        val universalYear = calculateUniversalYear(date.year)
        val monthReduction = reduceCycle(date.monthValue)
        val total = reduceCycle(universalYear.reducedNumber + monthReduction.reducedNumber)
        val start = date.withDayOfMonth(1)
        val end = start.plusMonths(1)

        return CycleResult(
            originalSum = total.originalSum,
            reducedNumber = total.reducedNumber,
            displayValue = total.displayValue,
            calculationNote = total.calculationNote,
            startDate = start,
            endDate = end,
            dateLabel = start.format(MONTH_YEAR_FORMAT)
        )
    }

    fun calculatePersonalYear(reference: LocalDate, birthday: Birthday): CycleResult {
        val currentYear = reference.year
        val thisYearsBirthday = birthdayInYear(currentYear, birthday)
        val anchorYear = if (!reference.isBefore(thisYearsBirthday)) {
            currentYear
        } else {
            currentYear - 1
        }

        val start = birthdayInYear(anchorYear, birthday)
        val end = birthdayInYear(anchorYear + 1, birthday)
        val sum =
            Numerology.sumDigits(birthday.month) +
                Numerology.sumDigits(birthday.day) +
                Numerology.sumDigits(anchorYear)
        val reduction = reduceCycle(sum)

        return CycleResult(
            originalSum = reduction.originalSum,
            reducedNumber = reduction.reducedNumber,
            displayValue = reduction.displayValue,
            calculationNote = reduction.calculationNote,
            startDate = start,
            endDate = end,
            dateLabel = cycleDateLabel(start, end)
        )
    }

    fun calculatePersonalMonth(reference: LocalDate, birthday: Birthday): CycleResult {
        val personalYear = calculatePersonalYear(reference, birthday)

        // Most recent birth-day transition on or before the reference date.
        var startYear = reference.year
        var startMonth = reference.monthValue
        var start = birthdayInYear(startYear, Birthday(startMonth, birthday.day))

        if (start.isAfter(reference)) {
            startMonth -= 1
            if (startMonth == 0) {
                startMonth = 12
                startYear -= 1
            }
            start = birthdayInYear(startYear, Birthday(startMonth, birthday.day))
        }

        val nextMonth = if (startMonth == 12) 1 else startMonth + 1
        val nextYear = if (startMonth == 12) startYear + 1 else startYear
        val end = birthdayInYear(nextYear, Birthday(nextMonth, birthday.day))

        val monthReduction = reduceCycle(startMonth)
        val total = reduceCycle(personalYear.reducedNumber + monthReduction.reducedNumber)

        return CycleResult(
            originalSum = total.originalSum,
            reducedNumber = total.reducedNumber,
            displayValue = total.displayValue,
            calculationNote = total.calculationNote,
            startDate = start,
            endDate = end,
            dateLabel = cycleDateLabel(start, end)
        )
    }

    fun calculateCycleEnergies(
        reference: LocalDate,
        birthday: Birthday?
    ): CycleEnergies {
        return CycleEnergies(
            universalYear = calculateUniversalYear(reference.year),
            universalMonth = calculateUniversalMonth(reference),
            personalYear = birthday?.let { calculatePersonalYear(reference, it) },
            personalMonth = birthday?.let { calculatePersonalMonth(reference, it) }
        )
    }

    private fun birthdayInYear(year: Int, birthday: Birthday): LocalDate {
        val lastDay = YearMonth.of(year, birthday.month).lengthOfMonth()
        return LocalDate.of(year, birthday.month, min(birthday.day, lastDay))
    }

    private fun cycleDateLabel(start: LocalDate, endExclusive: LocalDate): String {
        return if (start.year == endExclusive.year) {
            "${start.format(SHORT_DATE)} – ${endExclusive.format(FULL_DATE)}"
        } else {
            "${start.format(FULL_DATE)} – ${endExclusive.format(FULL_DATE)}"
        }
    }
}
